import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, PlusCircle } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { fetchTable } from "@/lib/data";

export type ActivityLog = {
  id: string;
  title: string;
  category: string;
  date: string;
  user_name: string;
  details: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({ meta: [{ title: "Activities | EMD Inventory" }] }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const [filter, setFilter] = useState("all");
  const { data: activities = [] } = useSuspenseQuery({
    queryKey: ["activity_logs"],
    queryFn: () => fetchTable<ActivityLog>("activity_logs", "created_at", false),
  });

  const filtered = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentWeek = Math.floor((now.getDate() - now.getDay() + 6) / 7);
    
    if (filter === "monthly") {
      return activities.filter((item) => new Date(item.created_at).getMonth() === currentMonth);
    }
    if (filter === "weekly") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return activities.filter((item) => new Date(item.created_at) >= weekStart);
    }
    if (filter === "daily") {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      return activities.filter((item) => new Date(item.created_at) >= dayStart);
    }
    return activities;
  }, [activities, filter]);

  return (
    <AppShell title="Activities" description="Track campaigns, sales moves, and team execution">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            ["all", "All Time"],
            ["monthly", "Monthly"],
            ["weekly", "Weekly"],
            ["daily", "Daily"],
          ].map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={filter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Button type="button">
          <PlusCircle className="size-4" /> New Activity
        </Button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="panel p-4"><p className="text-sm text-muted-foreground">Total activities</p><p className="mt-2 text-3xl font-semibold">{activities.length}</p></div>
        <div className="panel p-4">
          <p className="text-sm text-muted-foreground">This month</p>
          <p className="mt-2 text-3xl font-semibold">
            {activities.filter((item) => new Date(item.created_at).getMonth() === new Date().getMonth()).length}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-muted-foreground">This week</p>
          <p className="mt-2 text-3xl font-semibold">
            {(() => {
              const weekStart = new Date();
              weekStart.setDate(new Date().getDate() - new Date().getDay());
              return activities.filter((item) => new Date(item.created_at) >= weekStart).length;
            })()}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((activity) => (
          <article key={activity.id} className="panel overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">{activity.category || "General"}</span>
              <span className="text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleDateString("en-GH")}</span>
            </div>
            <h3 className="text-lg font-semibold">{activity.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{activity.details}</p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">{activity.user_name || "System"}</span>
              <span className="inline-flex items-center gap-1 text-primary"><CalendarRange className="size-3.5" /> Activity</span>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
