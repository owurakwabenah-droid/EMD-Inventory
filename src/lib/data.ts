import { supabase } from "./supabase";
import { enqueue, readCache, writeCache } from "./offline";

export type Product = {
  id: string;
  name: string;
  stock: number | null;
  price?: number | null;
  retail_price?: number | null;
  distributor_price?: number | null;
  package_size?: string | null;
  is_active?: boolean | null;
  enabled?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  created_at?: string | null;
};

export type Order = {
  id: string;
  order_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  created_by: string | null;
  status: string | null;
  order_date: string | null;
  total?: number | null;
  total_amount?: number | null;
  grand_total?: number | null;
  amount?: number | null;
  created_by_name?: string | null;
  created_at?: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number | null;
};

export type ActivityLog = {
  id: string;
  user_id: string | null;
  action: string | null;
  details: unknown;
  created_at: string | null;
};

export type DashboardSnapshot = {
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  profiles: Array<{ id: string; username: string | null; email: string | null }>;
  loginEvents: Array<{
    user_id: string | null;
    created_at: string | null;
    logged_in_at?: string | null;
  }>;
  profilePermissions: Array<Record<string, unknown>>;
  restockAccess: Array<Record<string, unknown>>;
  appSettings: Array<Record<string, unknown>>;
};

const online = () => typeof navigator === "undefined" || navigator.onLine;

/** Fetches from Supabase when online, otherwise serves the offline cache. */
export async function fetchTable<T>(
  table: string,
  orderBy = "created_at",
  ascending = false,
): Promise<T[]> {
  if (!online()) return readCache<T>(table);
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(orderBy, { ascending })
    .limit(500);
  if (error) {
    console.error(`Failed to load ${table}`, error);
    return readCache<T>(table);
  }
  writeCache(table, data ?? []);
  return (data ?? []) as T[];
}

const DASHBOARD_CACHE_KEY = "emd.dashboard.snapshot.v1";

function readDashboardCache(): DashboardSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_CACHE_KEY);
    return raw ? (JSON.parse(raw) as DashboardSnapshot) : null;
  } catch {
    return null;
  }
}

/** Loads the dashboard's existing Supabase tables as one cacheable snapshot. */
export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!online()) return readDashboardCache() ?? emptyDashboardSnapshot();

  const tables = await Promise.all([
    fetchTable<Product>("products"),
    fetchTable<Order>("orders"),
    fetchTable<OrderItem>("order_items"),
    fetchTable<DashboardSnapshot["profiles"][number]>("profiles"),
    fetchTable<DashboardSnapshot["loginEvents"][number]>("login_events"),
    fetchTable<Record<string, unknown>>("profile_permissions"),
    fetchTable<Record<string, unknown>>("restock_access"),
    fetchTable<Record<string, unknown>>("app_settings"),
  ]);
  const snapshot = {
    products: tables[0],
    orders: tables[1],
    orderItems: tables[2],
    profiles: tables[3],
    loginEvents: tables[4],
    profilePermissions: tables[5],
    restockAccess: tables[6],
    appSettings: tables[7],
  } satisfies DashboardSnapshot;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(snapshot));
  }
  return snapshot;
}

function emptyDashboardSnapshot(): DashboardSnapshot {
  return {
    products: [],
    orders: [],
    orderItems: [],
    profiles: [],
    loginEvents: [],
    profilePermissions: [],
    restockAccess: [],
    appSettings: [],
  };
}

function localId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Insert that works offline: writes to the cache and queues the change. */
export async function createRow<T extends Record<string, unknown>>(
  table: string,
  values: T,
): Promise<{ queued: boolean }> {
  const row = { id: localId(), created_at: new Date().toISOString(), ...values };
  if (online()) {
    const { error } = await supabase.from(table).insert(row);
    if (!error) return { queued: false };
    console.error(`Insert into ${table} failed, queuing`, error);
  }
  enqueue({ table, op: "insert", payload: row });
  writeCache(table, [row, ...readCache(table)]);
  return { queued: true };
}

export async function updateRow(
  table: string,
  id: string,
  values: Record<string, unknown>,
): Promise<{ queued: boolean }> {
  if (online()) {
    const { error } = await supabase.from(table).update(values).eq("id", id);
    if (!error) return { queued: false };
    console.error(`Update on ${table} failed, queuing`, error);
  }
  enqueue({ table, op: "update", matchId: id, payload: values });
  writeCache(
    table,
    readCache<Record<string, unknown>>(table).map((r) =>
      r["id"] === id ? { ...r, ...values } : r,
    ),
  );
  return { queued: true };
}

export async function deleteRow(table: string, id: string): Promise<{ queued: boolean }> {
  if (online()) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) return { queued: false };
    console.error(`Delete on ${table} failed, queuing`, error);
  }
  enqueue({ table, op: "delete", matchId: id });
  writeCache(
    table,
    readCache<Record<string, unknown>>(table).filter((r) => r["id"] !== id),
  );
  return { queued: true };
}
