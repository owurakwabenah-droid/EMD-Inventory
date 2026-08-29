import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  EyeOff,
  Package,
  RefreshCw,
  ShoppingCart,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchDashboardSnapshot, type DashboardSnapshot, type Order, type Product } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { useOnline, usePendingCount } from "@/hooks/use-online";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | EMD Inventory" },
      { name: "description", content: "Live overview of EMD stock levels, orders and customers." },
    ],
  }),
  component: Dashboard,
});

const chartColors = ["#087f8c", "#f2a900", "#3f8f6b", "#e76f51", "#5b6c8f"];

function numberValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function isCompleted(order: Order) {
  return ["completed", "complete", "paid", "fulfilled"].includes((order.status ?? "").toLowerCase());
}

function orderTotal(order: Order) {
  return numberValue(order as unknown as Record<string, unknown>, ["total", "total_amount", "grand_total", "amount"]);
}

function isEnabled(product: Product) {
  const row = product as unknown as Record<string, unknown>;
  if (row["is_active"] === false || row["enabled"] === false) return false;
  return String(row["status"] ?? "active").toLowerCase() !== "disabled";
}

function formatGhs(value: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(value);
}

function formatUsd(value: number, rate: number | null) {
  return rate === null
    ? "USD rate unavailable"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value * rate);
}

function StatCard({ label, value, secondary, icon: Icon, tone = "teal" }: {
  label: string;
  value: string;
  secondary?: string;
  icon: typeof Boxes;
  tone?: "teal" | "gold" | "green" | "coral";
}) {
  const toneClass = { teal: "bg-cyan-700", gold: "bg-amber-500", green: "bg-emerald-600", coral: "bg-orange-500" }[tone];
  return (
    <div className="panel relative overflow-hidden p-5">
      <div className={`absolute inset-y-0 left-0 w-1 ${toneClass}`} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{value}</p>
      {secondary ? <p className="mt-1 text-xs text-muted-foreground">{secondary}</p> : null}
    </div>
  );
}

function Dashboard() {
  const { profile, user, isAdmin, isFinance } = useAuth();
  const online = useOnline();
  const pending = usePendingCount();
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const snapshot = useQuery<DashboardSnapshot>({
    queryKey: ["dashboard-snapshot"],
    queryFn: fetchDashboardSnapshot,
    refetchInterval: online ? 60000 : false,
  });

  useEffect(() => {
    if (online) void snapshot.refetch();
  }, [online]);

  const emptySnapshot: DashboardSnapshot = {
    products: [], orders: [], orderItems: [], profiles: [], loginEvents: [], profilePermissions: [], restockAccess: [], appSettings: [],
  };
  const data = snapshot.data ?? emptySnapshot;
  const completedOrders = data.orders.filter(isCompleted);
  const revenue = completedOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const productsSold = data.orderItems.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  const stock = data.products.reduce((sum, product) => sum + Number(product.stock ?? 0), 0);
  const rateRow = data.appSettings.find((row) => String(row["key"] ?? row["name"]).toLowerCase().includes("usd"));
  const usdRate = rateRow ? numberValue(rateRow, ["value", "setting_value", "rate"]) : null;
  const threshold = 5;
  const lowStock = data.products.filter((product) => isEnabled(product) && Number(product.stock ?? 0) <= threshold);
  const permissionRows = [...data.profilePermissions, ...data.restockAccess];
  const canRestock = isAdmin && !isFinance
    || (!isFinance && permissionRows.some((row) => String(row["user_id"] ?? row["profile_id"]) === user?.id && ["true", "restock", "manage_inventory"].includes(String(row["allowed"] ?? row["permission"] ?? row["permission_name"] ?? "")) || row["allowed"] === true));
  const productNames = new Map(data.products.map((product) => [product.id, product.name]));
  const distribution = Object.entries(data.orderItems.reduce<Record<string, number>>((result, item) => {
    const name = item.product_name ?? (item.product_id ? productNames.get(item.product_id) : null) ?? "Unknown product";
    result[name] = (result[name] ?? 0) + Number(item.quantity ?? 0);
    return result;
  }, {})).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      date: date.toLocaleDateString("en-GH", { weekday: "short" }),
      revenue: completedOrders.filter((order) => (order.order_date ?? order.created_at ?? "").slice(0, 10) === key).reduce((sum, order) => sum + orderTotal(order), 0),
    };
  });
  const recentOrders = completedOrders.slice(0, showAllOrders ? 50 : 5);
  const lastLogin = data.loginEvents.find((event) => event.user_id === user?.id);
  const profileEmail = profile?.email ?? user?.email ?? "Not available";

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setPasswordMessage("Use at least 6 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordMessage(error ? error.message : "Password updated.");
    if (!error) setPassword("");
  }

  return (
    <AppShell title={`Hello${profile?.username ? `, ${profile.username}` : ""}`} description="Your live sales and stock snapshot">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat("en-GH", { timeZone: "Africa/Accra", dateStyle: "long" }).format(new Date())}</p>
          <p className="mt-1 font-display text-lg font-semibold">Good business starts with a clear picture.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="size-4" />
          {new Intl.DateTimeFormat("en-GH", { timeZone: "Africa/Accra", timeStyle: "short" }).format(new Date())} Accra
          <Badge variant={online ? "secondary" : "destructive"}>{online ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}{pending ? `${pending} pending` : online ? "All changes synced" : "Offline"}</Badge>
        </div>
      </div>
      {snapshot.isError ? <div className="mb-5 flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertTriangle className="size-4" /> Supabase data could not be loaded. Cached data is shown when available.</div> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total revenue" value={formatGhs(revenue)} secondary={formatUsd(revenue, usdRate)} icon={CircleDollarSign} />
        <StatCard label="Completed orders" value={String(completedOrders.length)} secondary="Completed orders only" icon={ShoppingCart} tone="gold" />
        <StatCard label="Products sold" value={productsSold.toLocaleString()} secondary="Units in completed orders" icon={Package} tone="green" />
        <StatCard label="Average order value" value={formatGhs(completedOrders.length ? revenue / completedOrders.length : 0)} secondary={formatUsd(completedOrders.length ? revenue / completedOrders.length : 0, usdRate)} icon={BarChart3} tone="coral" />
        <StatCard label="Product types" value={String(data.products.length)} secondary="Cataloged products" icon={Boxes} />
        <StatCard label="Units in stock" value={stock.toLocaleString()} secondary={`${lowStock.length} at or below ${threshold} units`} icon={Package} tone="gold" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="panel p-5"><div className="flex items-center justify-between"><div><h2 className="font-display font-semibold">Revenue trends</h2><p className="mt-1 text-sm text-muted-foreground">Completed revenue, last 7 days</p></div><CalendarDays className="size-5 text-muted-foreground" /></div><div className="mt-6 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dce8e5" /><XAxis dataKey="date" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₵${value}`} /><Tooltip formatter={(value) => formatGhs(Number(value))} /><Line type="monotone" dataKey="revenue" stroke="#087f8c" strokeWidth={3} dot={{ r: 4, fill: "#f2a900" }} /></LineChart></ResponsiveContainer></div></section>
        <section className="panel p-5"><div className="flex items-center justify-between"><div><h2 className="font-display font-semibold">Product distribution</h2><p className="mt-1 text-sm text-muted-foreground">Top-selling products</p></div><BarChart3 className="size-5 text-muted-foreground" /></div>{distribution.length ? <div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution} layout="vertical" margin={{ left: 10, right: 10 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="quantity" radius={[0, 4, 4, 0]}>{distribution.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}</Bar></BarChart></ResponsiveContainer></div> : <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No completed product sales yet.</div>}</section>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.7fr]">
        <section className="panel p-5"><div className="flex items-start justify-between"><div><h2 className="font-display font-semibold">Low stock</h2><p className="mt-1 text-sm text-muted-foreground">Products needing attention</p></div><AlertTriangle className="size-5 text-amber-600" /></div><div className="mt-4 divide-y divide-border">{lowStock.slice(0, 6).map((product) => <div className="flex items-center justify-between gap-3 py-3" key={product.id}><div className="min-w-0"><p className="truncate text-sm font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.stock ?? 0} units remaining</p></div>{canRestock ? <Button size="sm" variant="outline"><RefreshCw className="size-3.5" /> Restock</Button> : null}</div>)}{!lowStock.length ? <p className="py-5 text-sm text-muted-foreground">Everything is well stocked.</p> : null}</div></section>
        <section className="panel overflow-hidden"><div className="flex items-center justify-between p-5"><div><h2 className="font-display font-semibold">Recent activity</h2><p className="mt-1 text-sm text-muted-foreground">Five most recent completed orders</p></div><Button variant="ghost" size="sm" onClick={() => setShowAllOrders((value) => !value)}>{showAllOrders ? "Show less" : "View all"}<ChevronRight className="size-4" /></Button></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y border-border bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3">Order</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Date & time</th><th className="px-3 py-3">Created by</th><th className="px-3 py-3">Total</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-border">{recentOrders.map((order) => <tr key={order.id}><td className="px-5 py-3 font-medium">{order.order_number ?? order.id.slice(0, 8)}</td><td className="px-3 py-3">{order.customer_name ?? "Walk-in"}</td><td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{order.created_at ? new Date(order.created_at).toLocaleString("en-GH", { timeZone: "Africa/Accra", dateStyle: "short", timeStyle: "short" }) : "-"}</td><td className="px-3 py-3">{order.created_by_name ?? data.profiles.find((item) => item.id === order.created_by)?.username ?? order.created_by?.slice(0, 8) ?? "-"}</td><td className="whitespace-nowrap px-3 py-3">{formatGhs(orderTotal(order))}</td><td className="px-5 py-3"><Badge variant="secondary"><CheckCircle2 className="mr-1 size-3" />{order.status ?? "completed"}</Badge></td></tr>)}</tbody></table>{!recentOrders.length ? <p className="p-6 text-sm text-muted-foreground">No completed orders recorded yet.</p> : null}</div></section>
      </div>
      <section className="panel mt-5 p-5"><div className="flex items-start gap-4"><div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-primary">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : <UserRound className="size-6" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display font-semibold">Your profile</h2><Badge variant="outline" className="capitalize">{profile?.role ?? "sales"}</Badge></div><div className="mt-2 grid gap-x-8 gap-y-1 text-sm text-muted-foreground sm:grid-cols-3"><span>Username: {profile?.username ?? "-"}</span><span>Email: {profileEmail}</span><span>Last login: {lastLogin ? new Date(lastLogin.created_at ?? lastLogin.logged_in_at ?? "").toLocaleString("en-GH", { timeZone: "Africa/Accra" }) : "Not recorded"}</span></div><form className="mt-4 flex max-w-md flex-wrap gap-2" onSubmit={changePassword}><div className="relative flex-1"><Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" autoComplete="new-password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-2.5 text-muted-foreground" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><Button type="submit" variant="outline">Change password</Button>{passwordMessage ? <span className="basis-full text-xs text-muted-foreground">{passwordMessage}</span> : null}</form></div></div></section>
    </AppShell>
  );
}
