import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Archive,
  Boxes,
  Calculator,
  ChartColumn,
  ClipboardList,
  Cloud,
  CloudOff,
  Headphones,
  LayoutDashboard,
  LogOut,
  Music4,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useOnline, usePendingCount } from "@/hooks/use-online";
import { flushQueue } from "@/lib/offline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/new-order", label: "New Order", icon: ShoppingCart },
  { to: "/track-orders", label: "Track Orders", icon: ClipboardList },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/order-history", label: "Order History", icon: TrendingUp },
  { to: "/daily-report", label: "Daily Report", icon: FileText },
  { to: "/report-tracker", label: "Report Tracker", icon: ChartColumn },
  { to: "/activities", label: "Activities", icon: Activity },
  { to: "/calculator", label: "Calculator", icon: Calculator },
  { to: "/activity-log", label: "Activity Log", icon: Activity },
  { to: "/product-manager", label: "Product Manager", icon: Boxes },
  { to: "/music-manager", label: "Music Manager", icon: Music4 },
  { to: "/backup-restore", label: "Backup & Restore", icon: Archive },
] as const;

const FINANCE_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/order-history", label: "Order History", icon: TrendingUp },
  { to: "/daily-report", label: "Daily Report", icon: FileText },
  { to: "/report-tracker", label: "Report Tracker", icon: ChartColumn },
  { to: "/activities", label: "Activities", icon: Activity },
  { to: "/activity-log", label: "Activity Log", icon: Activity },
] as const;

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { profile, user, isAdmin, isFinance, signOut } = useAuth();
  const navigate = useNavigate();
  const online = useOnline();
  const pending = usePendingCount();
  const [syncStatus, setSyncStatus] = useState<"syncing" | "failed" | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!online) setSyncStatus(null);
    else if (!pending) setSyncStatus(null);
  }, [online, pending]);

  const items = isAdmin
    ? [...NAV, { to: "/user-management", label: "User Management", icon: ShieldCheck }]
    : isFinance
      ? FINANCE_NAV
      : NAV.filter((item) => !["/user-management", "/backup-restore", "/music-manager"].includes(item.to));

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-5 py-6">
          <p className="font-display text-lg font-semibold tracking-tight">EMD Inventory</p>
          <p className="mt-1 text-xs text-sidebar-foreground/60">Sales &amp; stock control</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs">
          <p className="font-medium">{profile?.username ?? user?.email}</p>
          <p className="text-sidebar-foreground/60 capitalize">{profile?.role ?? "sales"}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            onClick={async () => {
              await signOut();
              navigate({ to: "/", replace: true });
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{title}</h1>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={online ? "secondary" : "destructive"} className="gap-1.5">
              {online ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}
              {online ? (syncStatus === "syncing" ? "Syncing" : syncStatus === "failed" ? "Sync failed" : pending ? "Online" : "All changes synced") : "Offline"}
            </Badge>
            {pending > 0 && online ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setSyncStatus("syncing");
                  const { synced, failed } = await flushQueue();
                  if (synced) toast.success(`Synced ${synced} change${synced > 1 ? "s" : ""}`);
                  if (failed) {
                    setSyncStatus("failed");
                    toast.error("Sync failed — changes stay queued");
                  } else {
                    setSyncStatus(null);
                  }
                  if (!synced && !failed) toast.info("Nothing to sync right now");
                }}
              >
                <RefreshCw className="size-3.5" /> {pending} pending
              </Button>
            ) : null}
            {actions}
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 md:hidden">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground [&.active]:bg-secondary [&.active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
