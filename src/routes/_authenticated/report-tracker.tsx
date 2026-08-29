import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { fetchTable } from "@/lib/data";

export type Report = {
  id: string;
  report_id: string;
  sent_by: string;
  sent_to: string;
  total_orders: number;
  total_revenue: number;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/report-tracker")({
  head: () => ({ meta: [{ title: "Report Tracker | EMD Inventory" }] }),
  component: ReportTrackerPage,
});

const money = (value: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);

function ReportTrackerPage() {
  const { data: reports = [] } = useSuspenseQuery({
    queryKey: ["reports"],
    queryFn: () => fetchTable<Report>("reports", "created_at", false),
  });

  return (
    <AppShell title="Report Tracker" description="Track reports sent, status, and revenue totals">
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Sent reports</h2>
            <p className="text-sm text-muted-foreground">Delivery history and current report status.</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground"><Activity className="size-4" /> {reports.length} reports</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Report ID</th>
                <th className="px-4 py-3">Sent by</th>
                <th className="px-4 py-3">Sent to</th>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-4 py-3 font-medium">{report.report_id}</td>
                  <td className="px-4 py-3">{report.sent_by}</td>
                  <td className="px-4 py-3">{report.sent_to}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(report.created_at).toLocaleString("en-GH")}</td>
                  <td className="px-4 py-3">{report.total_orders}</td>
                  <td className="px-4 py-3">{money(report.total_revenue)}</td>
                  <td className="px-4 py-3"><Badge variant={report.status === "Sent" ? "secondary" : "outline"}>{report.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
