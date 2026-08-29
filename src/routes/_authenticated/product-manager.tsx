import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultProducts } from "@/lib/dashboard-data";

export const Route = createFileRoute("/_authenticated/product-manager")({
  head: () => ({ meta: [{ title: "Product Manager | EMD Inventory" }] }),
  component: ProductManagerPage,
});

const money = (value: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);

function ProductManagerPage() {
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("500");
  const [search, setSearch] = useState("");
  const products = useMemo(() => defaultProducts, []);

  const filtered = useMemo(() => {
    const min = Number(minPrice || 0);
    const max = Number(maxPrice || Number.MAX_SAFE_INTEGER);
    return products.filter((product) => {
      const inSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const inRange = product.price >= min && product.price <= max;
      return inSearch && inRange;
    });
  }, [maxPrice, minPrice, products, search]);

  return (
    <AppShell title="Product Manager" description="Price filtering, stock oversight, and product maintenance">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4"><p className="text-sm text-muted-foreground">Product types</p><p className="mt-2 text-3xl font-semibold">{products.length}</p></div>
        <div className="panel p-4"><p className="text-sm text-muted-foreground">Units in stock</p><p className="mt-2 text-3xl font-semibold">{products.reduce((sum, item) => sum + item.stock, 0)}</p></div>
        <div className="panel p-4"><p className="text-sm text-muted-foreground">Low stock</p><p className="mt-2 text-3xl font-semibold text-amber-600">{products.filter((item) => item.stock <= 5).length}</p></div>
        <div className="panel p-4"><p className="text-sm text-muted-foreground">Avg. price</p><p className="mt-2 text-3xl font-semibold">{money(products.reduce((sum, item) => sum + item.price, 0) / products.length)}</p></div>
      </div>

      <section className="panel mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Min</label>
            <Input type="number" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} className="w-28" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Max</label>
            <Input type="number" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="w-28" />
          </div>
          <Button type="button">
            <Plus className="size-4" /> Add product
          </Button>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                  <td className="px-4 py-3">{money(product.price)}</td>
                  <td className="px-4 py-3">{product.stock}</td>
                  <td className="px-4 py-3">
                    <Badge variant={product.stock <= 5 ? "secondary" : "outline"} className={product.stock <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                      {product.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-primary">
                      <button type="button">Edit</button>
                      <button type="button" className="text-muted-foreground">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
