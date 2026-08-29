import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

const FINANCE_ALLOWED = new Set([
  "/dashboard",
  "/order-history",
  "/daily-report",
  "/report-tracker",
  "/activities",
  "/activity-log",
]);

const SALES_ALLOWED = new Set([
  "/dashboard",
  "/new-order",
  "/track-orders",
  "/customers",
  "/order-history",
  "/daily-report",
  "/report-tracker",
  "/activities",
  "/calculator",
  "/activity-log",
  "/product-manager",
]);

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw redirect({ to: "/" });

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .maybeSingle();

    const role = String(profileData?.role ?? data.session.user.email ?? "sales")
      .trim()
      .toLowerCase();

    const isAdmin = ["admin", "main admin", "boison"].includes(role);
    const isFinance = ["finance", "financier", "finance manager", "financial"].includes(role);

    if (isAdmin) return { user: data.session.user };

    const allowed = isFinance ? FINANCE_ALLOWED : SALES_ALLOWED;
    if (!allowed.has(location.pathname)) {
      throw redirect({ to: "/dashboard" });
    }

    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
