import { createFileRoute } from "@tanstack/react-router";
import { Activity, Clock3 } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { fetchTable } from "@/lib/data";

export type ActivityLog = {
  id: string;
  title: string;
  category: string;
  user_name: string;
  details: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/activity-log")({
  head: () => ({ meta: [{ title: "Activity Log | EMD Inventory" }] }),
  component: ActivityLogPage,
});

function ActivityLogPage() {
  const { data: activities = [] } = useSuspenseQuery({
    queryKey: ["activity_logs"],
    queryFn: () => fetchTable<ActivityLog>("activity_logs", "created_at", false),
  });
  const items = [...activities].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <AppShell title="Activity Log" description="Recap of actions, updates, and follow-ups across the team">
      <section className="panel p-5">
        <div className="mb-5 flex items-center gap-2">
          <Clock3 className="size-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Recent timeline</h2>
        </div>

        <div className="relative space-y-6 before:absolute before:left-3 before:top-0 before:h-full before:w-px before:bg-border">
          {items.map((item) => (
            <div key={item.id} className="relative pl-8">
              <span className="absolute left-0 top-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-white"><Activity className="size-3" /></span>
              <div className="rounded-xl border border-border bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.title}</p>
                  <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("en-GH")}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>Action: {item.category || "General"}</span>
                  <span>•</span>
                  <span>User: {item.user_name || "System"}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{item.details}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
