import { useEffect, useState } from "react";
import { getQueue, subscribeQueue } from "@/lib/offline";

export function useOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}

export function usePendingCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(getQueue().length);
    update();
    const unsub = subscribeQueue(update);
    const t = window.setInterval(update, 4000);
    return () => {
      unsub();
      window.clearInterval(t);
    };
  }, []);
  return count;
}
