import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Boxes, CheckCircle2, Search, ShieldCheck, Warehouse } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchTable, type Product, type Order } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/track-orders")({
  head: () => ({ meta: [{ title: "Track Orders | EMD Inventory" }] }),
  component: TrackOrdersPage,
});

const money = (value: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);

function TrackOrdersPage() {
  const [search, setSearch] = useState("");
  const { data: products = [] } = useSuspenseQuery({
    queryKey: ["products"],
    queryFn: () => fetchTable<Product>("products"),
  });
  const { data: orders = [] } = useSuspenseQuery({
    queryKey: ["orders"],
    queryFn: () => fetchTable<Order>("orders"),
  });

  const visibleProducts = useMemo(() => {
    const term = search.toLowerCase();
    return products.filter((product) => product.name.toLowerCase().includes(term));
  }, [products, search]);

  const inventoryValue = useMemo(() => {
    return products.reduce((sum, product) => {
      const qty = product.stock || 0;
      const price = product.price || product.retail_price || 0;
      return sum + qty * price;
    }, 0);
  }, [products]);

  return (
    <AppShell title="Track Orders" description="Monitor stock, inventory health, and open order flow">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <p className="text-sm text-muted-foreground">Product count</p>
          <p className="mt-2 text-2xl font-semibold">{products.length}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-muted-foreground">Low stock</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{products.filter((product) => (product.stock || 0) <= 5).length}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-muted-foreground">Open orders</p>
          <p className="mt-2 text-2xl font-semibold">{orders.filter((order) => order.status && order.status.toLowerCase() !== "paid").length}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-muted-foreground">Inventory value</p>
          <p className="mt-2 text-2xl font-semibold">{money(inventoryValue)}</p>
        </div>
      </div>

      <section className="panel mb-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Inventory overview</h2>
            <p className="text-sm text-muted-foreground">Price in GHS and USD, stock level, and state.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">Check Stock</Button>
            <Button>Add Product</Button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-3 relative max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">GHS</th>
                  <th className="px-4 py-3">USD</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Boxes className="size-4" /></div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{money(product.price)}</td>
                    <td className="px-4 py-3">{money(product.price / 10)}</td>
                    <td className="px-4 py-3">{product.stock}</td>
                    <td className="px-4 py-3">
                      <Badge variant={product.stock <= 5 ? "secondary" : "outline"} className={product.stock <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                        {product.stock <= 0 ? "Out of stock" : product.stock <= 5 ? "Low stock" : "In stock"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="text-sm text-primary">Edit</button>
                        <button className="text-sm text-muted-foreground">View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Orders tracking</h2>
            <p className="text-sm text-muted-foreground">Recent order movements and fulfillment status.</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground"><Warehouse className="size-4" /> {orders.length} records</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3">{order.customer}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(order.date).toLocaleDateString("en-GH")}</td>
                  <td className="px-4 py-3">{money(order.total)}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="gap-1"><CheckCircle2 className="size-3" /> {order.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
