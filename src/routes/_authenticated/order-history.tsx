import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchTable, type Order } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/order-history")({
  head: () => ({ meta: [{ title: "Order History | EMD Inventory" }] }),
  component: OrderHistoryPage,
});

const money = (value: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);

function OrderHistoryPage() {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: orders = [] } = useSuspenseQuery({
    queryKey: ["orders"],
    queryFn: () => fetchTable<Order>("orders", "created_at", false),
  });

  const filtered = orders.filter((order) => {
    const date = new Date(order.order_date || order.created_at || "").getTime();
    const from = startDate ? new Date(`${startDate}T00:00:00Z`).getTime() : -Infinity;
    const to = endDate ? new Date(`${endDate}T23:59:59Z`).getTime() : Infinity;
    return date >= from && date <= to;
  });

  return (
    <AppShell title="Order History" description="Filter and review historical transactions across the business">
      <section className="panel mb-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Start date</label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">End date</label>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <Button type="button">
            <Filter className="size-4" /> Filter
          </Button>
          <Button type="button" variant="outline">
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-medium">{order.order_number}</td>
                  <td className="px-4 py-3">{order.customer_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(order.order_date || order.created_at || "").toLocaleDateString("en-GH")}</td>
                  <td className="px-4 py-3">{order.channel || "Retail"}</td>
                  <td className="px-4 py-3">{order.status}</td>
                  <td className="px-4 py-3 font-medium">{money(Number(order.grand_total || order.total_amount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
