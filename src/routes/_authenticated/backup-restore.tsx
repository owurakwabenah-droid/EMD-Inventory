import { createFileRoute } from "@tanstack/react-router";
import { Download, HardDriveUpload, RefreshCcw, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/backup-restore")({
  head: () => ({ meta: [{ title: "Backup & Restore | EMD Inventory" }] }),
  component: BackupRestorePage,
});

function BackupRestorePage() {
  return (
    <AppShell title="Backup & Restore" description="Protect your data with export, import, and restore controls">
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-display text-xl font-semibold">Export data</h2>
          <p className="mt-2 text-sm text-muted-foreground">Download a backup file for the current inventory snapshot.</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-border bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Backup summary</p>
              <p className="mt-2 text-xl font-semibold">Inventory, orders, customers</p>
            </div>
            <Button type="button" className="w-full">
              <Download className="size-4" /> Download backup
            </Button>
            <Button type="button" variant="destructive" className="w-full">
              <RefreshCcw className="size-4" /> Download & Delete All
            </Button>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-display text-xl font-semibold">Import backup</h2>
          <p className="mt-2 text-sm text-muted-foreground">Upload a previous export to restore saved records.</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4">
              <label className="block text-sm font-medium">Backup file</label>
              <Input type="file" className="mt-2" />
            </div>
            <Button type="button" variant="outline" className="w-full">
              <HardDriveUpload className="size-4" /> Upload backup file
            </Button>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 size-4" />
                <span>Warning: importing a backup will replace current stored records. Please confirm before continuing.</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
