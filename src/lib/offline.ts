import { supabase } from "./supabase";

export type QueueOp = "insert" | "update" | "delete";

export type QueuedMutation = {
  id: string;
  table: string;
  op: QueueOp;
  payload?: Record<string, unknown>;
  matchId?: string;
  created_at: string;
};

const QUEUE_KEY = "emd.offline.queue.v1";
const CACHE_PREFIX = "emd.cache.v1.";

const isBrowser = () => typeof window !== "undefined";

/* ------------------------------- local cache ------------------------------ */

export function readCache<T = Record<string, unknown>>(table: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + table);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function writeCache(table: string, rows: unknown[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + table, JSON.stringify(rows));
  } catch {
    /* quota — ignore */
  }
}

/* --------------------------------- queue ---------------------------------- */

const listeners = new Set<() => void>();

export function subscribeQueue(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function getQueue(): QueuedMutation[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function setQueue(queue: QueuedMutation[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  emit();
}

export function enqueue(mutation: Omit<QueuedMutation, "id" | "created_at">) {
  const item: QueuedMutation = {
    ...mutation,
    id:
      isBrowser() && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    created_at: new Date().toISOString(),
  };
  setQueue([...getQueue(), item]);
  return item;
}

let flushing = false;

/** Replays every queued mutation against Supabase, oldest first. */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (!isBrowser() || flushing || !navigator.onLine) return { synced: 0, failed: 0 };
  flushing = true;
  let synced = 0;
  let failed = 0;
  try {
    let queue = getQueue();
    while (queue.length) {
      const item = queue[0]!;
      try {
        if (item.op === "insert") {
          const { error } = await supabase.from(item.table).insert(item.payload ?? {});
          if (error) throw error;
        } else if (item.op === "update") {
          const { error } = await supabase
            .from(item.table)
            .update(item.payload ?? {})
            .eq("id", item.matchId!);
          if (error) throw error;
        } else {
          const { error } = await supabase.from(item.table).delete().eq("id", item.matchId!);
          if (error) throw error;
        }
        synced += 1;
      } catch (err) {
        console.error("Sync failed for queued change", item, err);
        failed += 1;
        // stop on first failure so ordering is preserved
        break;
      }
      queue = getQueue().filter((q) => q.id !== item.id);
      setQueue(queue);
    }
  } finally {
    flushing = false;
  }
  return { synced, failed };
}
