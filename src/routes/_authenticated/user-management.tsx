import { createFileRoute } from "@tanstack/react-router";
import { Plus, RefreshCcw, ShieldCheck, UserCircle2 } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchTable } from "@/lib/data";

export type UserProfile = {
  id: string;
  username: string | null;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/user-management")({
  head: () => ({ meta: [{ title: "User Management | EMD Inventory" }] }),
  component: UserManagementPage,
});

function UserManagementPage() {
  const { data: users = [] } = useSuspenseQuery({
    queryKey: ["profiles"],
    queryFn: () => fetchTable<UserProfile>("profiles"),
  });

  return (
    <AppShell title="User Management" description="Admin controls for roles, access, and team onboarding">
      <section className="panel mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={users[0]?.avatar_url || "https://via.placeholder.com/56"} alt={users[0]?.full_name || "User"} className="size-14 rounded-full object-cover" />
            <div>
              <h2 className="font-display text-xl font-semibold">{users[0]?.full_name || users[0]?.username || "User"}</h2>
              <p className="text-sm text-muted-foreground">{users[0]?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-700">{users[0]?.status || "Active"}</Badge>
            <Button variant="outline"><RefreshCcw className="size-4" /> Reset password</Button>
            <Button variant="outline"><UserCircle2 className="size-4" /> Reset avatar</Button>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Additional users</h2>
            <p className="text-sm text-muted-foreground">Manage access and statuses for your team.</p>
          </div>
          <Button>
            <Plus className="size-4" /> Create user
          </Button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {users.slice(1).map((user) => (
            <article key={user.id} className="rounded-xl border border-border bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <img src={user.avatar_url || "https://via.placeholder.com/48"} alt={user.full_name || "User"} className="size-12 rounded-full object-cover" />
                <div>
                  <p className="font-medium">{user.full_name || user.username || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{user.email}</span>
                <Badge variant="outline">{user.status || "Active"}</Badge>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
