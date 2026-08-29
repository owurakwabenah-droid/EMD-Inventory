import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createRow, fetchTable, type Customer } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers | EMD Inventory" },
      { name: "description", content: "EMD customer directory with offline-capable entry." },
      { property: "og:title", content: "Customers | EMD Inventory" },
      {
        property: "og:description",
        content: "EMD customer directory with offline-capable entry.",
      },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchTable<Customer>("customers"),
  });

  const add = useMutation({
    mutationFn: () => createRow("customers", { name: name.trim(), phone: phone.trim() || null }),
    onSuccess: ({ queued }) => {
      setName("");
      setPhone("");
      toast[queued ? "info" : "success"](queued ? "Saved offline — will sync" : "Customer added");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: () => toast.error("Could not add customer"),
  });

  return (
    <AppShell title="Customers" description="People buying from EMD">
      <form
        className="panel mb-6 flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) add.mutate();
        }}
      >
        <div className="min-w-52 flex-1">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="w-48">
          <label className="text-xs font-medium text-muted-foreground">Phone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 000 0000" />
        </div>
        <Button type="submit" disabled={add.isPending}>
          <Plus className="size-4" /> Add customer
        </Button>
      </form>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(customers.data ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!customers.data?.length ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
