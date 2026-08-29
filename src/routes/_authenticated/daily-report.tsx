import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchTable, type Order } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/daily-report")({
  head: () => ({ meta: [{ title: "Daily Report | EMD Inventory" }] }),
  component: DailyReportPage,
});

const money = (value: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);

function DailyReportPage() {
  const [recipient, setRecipient] = useState("Main Admin");
  const [outputName, setOutputName] = useState("Admin");
  const { data: orders = [] } = useSuspenseQuery({
    queryKey: ["orders"],
    queryFn: () => fetchTable<Order>("orders", "created_at", false),
  });
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.grand_total || order.total_amount || 0), 0);

  return (
    <AppShell title="Daily Report" description="Compile and dispatch the operational summary to management">
      <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
        <section className="panel p-5">
          <h2 className="font-display text-xl font-semibold">Report setup</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">Select admin recipient</label>
              <select
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>Main Admin</option>
                <option>Operations</option>
                <option>Finance</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">Output admin username</label>
              <Input value={outputName} onChange={(event) => setOutputName(event.target.value)} />
            </div>
            <div className="rounded-lg border border-border bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Preview</p>
              <p className="mt-2 font-medium">Summary for {outputName}</p>
              <p className="mt-1 text-sm text-muted-foreground">Sending to {recipient}</p>
            </div>
            <Button type="button" className="w-full">
              <SendHorizonal className="size-4" /> Send report
            </Button>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-display text-xl font-semibold">Summary at a glance</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-emerald-50 p-4">
              <p className="text-sm text-muted-foreground">Total orders</p>
              <p className="mt-2 text-3xl font-semibold">{totalOrders}</p>
            </div>
            <div className="rounded-xl border border-border bg-sky-50 p-4">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="mt-2 text-3xl font-semibold">{money(totalRevenue)}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border p-4">
            <p className="mb-3 text-sm font-medium">Recent highlights</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Best moving item: B Comfort Capsules</li>
              <li>• Most active district: Accra Central</li>
              <li>• Pending fulfillment: 3 orders</li>
            </ul>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline">Status: Ready</Badge>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
