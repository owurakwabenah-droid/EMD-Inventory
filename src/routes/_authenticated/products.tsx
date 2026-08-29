import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, Edit3, PackagePlus, Power, Search, X, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchTable, createRow, updateRow, type Product } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
  PRODUCT_CATALOG,
  USD_TO_GHS,
  catalogPrice,
  seedProductCatalog,
  type PriceList,
} from "@/lib/product-catalog";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products | EMD Inventory" }] }),
  component: ProductsPage,
});

const rowValue = (product: Product, keys: string[]) => {
  const row = product as unknown as Record<string, unknown>;
  for (const key of keys) if (row[key] !== null && row[key] !== undefined) return row[key];
  return null;
};
const priceOf = (product: Product, priceList: PriceList) =>
  catalogPrice(
    {
      price: Number(rowValue(product, ["price", "unit_price", "selling_price"])),
      retail_price: Number(rowValue(product, ["retail_price"])),
      distributor_price: Number(rowValue(product, ["distributor_price"])),
    },
    priceList,
  );
const enabledOf = (product: Product) =>
  rowValue(product, ["is_active", "enabled"]) !== false &&
  String(rowValue(product, ["status"]) ?? "active").toLowerCase() !== "disabled";
const money = (value: number, currency: "GHS" | "USD") =>
  new Intl.NumberFormat(currency === "GHS" ? "en-GH" : "en-US", {
    style: "currency",
    currency,
  }).format(value);

function statusOf(product: Product) {
  if (!enabledOf(product)) return "Disabled";
  if (Number(product.stock ?? 0) === 0) return "Out of Stock";
  if (Number(product.stock ?? 0) <= 5) return "Low Stock";
  return "In Stock";
}

function ProductsPage() {
  const { isAdmin, isFinance } = useAuth();
  const client = useQueryClient();
  const canManageProducts = isAdmin && !isFinance;
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("active");
  const [priceList, setPriceList] = useState<PriceList>("retail");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: "0", stock: "0" });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchTable<Product>("products"),
  });
  const settings = useQuery({
    queryKey: ["app_settings"],
    queryFn: () => fetchTable<Record<string, unknown>>("app_settings"),
  });

  useEffect(() => {
    if (!products.data || products.data.length > 0 || products.isLoading) return;
    void seedProductCatalog();
    void client.invalidateQueries({ queryKey: ["products"] });
  }, [products.data, products.isLoading, client]);

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["products"] });
    void client.invalidateQueries({ queryKey: ["dashboard-snapshot"] });
  };
  const visible = useMemo(
    () =>
      (products.data ?? []).filter((product) => {
        const status = statusOf(product);
        const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
        const matchesPrice =
          priceFilter === "all" ||
          (priceFilter === "under"
            ? priceOf(product, priceList) < 100
            : priceFilter === "over"
              ? priceOf(product, priceList) >= 100
              : true);
        const matchesStock =
          stockFilter === "all" ||
          (stockFilter === "low"
            ? Number(product.stock ?? 0) > 0 && Number(product.stock ?? 0) <= 5
            : stockFilter === "out"
              ? Number(product.stock ?? 0) === 0
              : Number(product.stock ?? 0) > 5);
        return (
          matchesSearch &&
          matchesPrice &&
          matchesStock &&
          (activeFilter === "all" ||
            (activeFilter === "active" ? enabledOf(product) : !enabledOf(product))) &&
          status
        );
      }),
    [products.data, search, priceFilter, stockFilter, activeFilter, priceList],
  );
  const totalStock = (products.data ?? []).reduce(
    (total, product) => total + Number(product.stock ?? 0),
    0,
  );
  const lowStock = (products.data ?? []).filter(
    (product) => enabledOf(product) && Number(product.stock ?? 0) <= 5,
  ).length;
  const averagePrice = (products.data ?? []).length
    ? (products.data ?? []).reduce((total, product) => total + priceOf(product, priceList), 0) /
      (products.data ?? []).length
    : 0;
  const rate = USD_TO_GHS;
  const loadCatalog = useMutation({
    mutationFn: async () => {
      let queued = false;
      for (const item of PRODUCT_CATALOG) {
        const match = (products.data ?? []).find(
          (product) => product.name.trim().toLowerCase() === item.name.toLowerCase(),
        );
        const result = match
          ? await updateRow("products", match.id, {
              price: item.retail_price,
              retail_price: item.retail_price,
              distributor_price: item.distributor_price,
              package_size: item.package_size ?? null,
            })
          : await createRow("products", {
              name: item.name,
              stock: 0,
              price: item.retail_price,
              retail_price: item.retail_price,
              distributor_price: item.distributor_price,
              package_size: item.package_size ?? null,
              is_active: true,
            });
        queued ||= result.queued;
      }
      return queued;
    },
    onSuccess: (queued) => {
      refresh();
      toast.info(queued ? "Price list queued for sync" : "40 products loaded");
    },
    onError: () => toast.error("Could not load the product price list"),
  });

  const saveProduct = useMutation({
    mutationFn: async () => {
      const values = {
        name: form.name.trim(),
        price: Math.max(0, Number(form.price) || 0),
        retail_price: Math.max(0, Number(form.price) || 0),
        distributor_price: Math.max(0, Number(form.price) || 0),
        stock: Math.max(0, Number(form.stock) || 0),
        is_active: true,
      };
      if (editing) return updateRow("products", editing, values);
      return createRow("products", values);
    },
    onSuccess: ({ queued }) => {
      setEditing(null);
      setForm({ name: "", price: "0", stock: "0" });
      refresh();
      toast.info(queued ? "Saved offline and queued for sync" : "Product saved");
    },
    onError: () => toast.error("Product could not be saved"),
  });
  const changeProduct = useMutation({
    mutationFn: async ({ product, action }: { product: Product; action: "toggle" | "restock" }) => {
      const amount = action === "restock" ? 10 : 0;
      const nextStock =
        action === "restock" ? Number(product.stock ?? 0) + amount : Number(product.stock ?? 0);
      const result = await updateRow(
        "products",
        product.id,
        action === "toggle"
          ? {
              is_active: !enabledOf(product),
              enabled: !enabledOf(product),
              status: enabledOf(product) ? "disabled" : "active",
            }
          : { stock: nextStock },
      );
      if (action === "restock") {
        await createRow("inventory_movements", {
          product_id: product.id,
          quantity: amount,
          movement_type: "restock",
          reason: "Dashboard restock",
        });
      }
      return result;
    },
    onSuccess: ({ queued }) => {
      refresh();
      toast.info(queued ? "Change queued offline" : "Inventory updated");
    },
    onError: () => toast.error("Inventory change failed"),
  });

  return (
    <AppShell title="Products" description="Manage prices, availability and stock">
      <div className="panel mb-3 flex flex-wrap items-center gap-3 p-4 border-l-4 border-l-primary">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">View</label>
        <select
          className="h-10 rounded-lg border border-input bg-background px-4 text-sm font-medium transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          value={priceList}
          onChange={(event) => setPriceList(event.target.value as PriceList)}
        >
          <option value="retail">Retail Prices</option>
          <option value="distributor">Distributor Prices</option>
        </select>
        {canManageProducts ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => loadCatalog.mutate()}
            disabled={loadCatalog.isPending}
            className="ml-auto"
          >
            <PackagePlus className="w-4 h-4" /> Load Catalog
          </Button>
        ) : null}
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Product types" value={(products.data ?? []).length} />
        <Summary label="Total quantity" value={totalStock} />
        <Summary label="Low-stock products" value={lowStock} />
        <Summary label="Average price" value={money(averagePrice, "GHS")} />
      </div>
      <div className="panel mb-5 p-6 border-l-4 border-l-emerald-500">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
              <Input
                className="pl-12 h-11 text-base font-medium"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by product name..."
              />
            </div>
            {canManageProducts ? (
              <Button
                onClick={() => {
                  setEditing("");
                  setForm({ name: "", price: "0", stock: "0" });
                }}
                className="gap-2"
              >
                <PackagePlus className="w-4 h-4" /> New Product
              </Button>
            ) : null}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-lg border border-input bg-background px-4 text-sm font-medium transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              value={priceFilter}
              onChange={(event) => setPriceFilter(event.target.value)}
            >
              <option value="all">All Prices</option>
              <option value="under">Under GHS 100</option>
              <option value="over">GHS 100+</option>
            </select>
            <select
              className="h-10 rounded-lg border border-input bg-background px-4 text-sm font-medium transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
            >
              <option value="all">All Stock</option>
              <option value="healthy">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <select
              className="h-10 rounded-lg border border-input bg-background px-4 text-sm font-medium transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
            >
              <option value="active">Active Only</option>
              <option value="disabled">Disabled Only</option>
              <option value="all">All Products</option>
            </select>
          </div>
        </div>
      </div>
      {canManageProducts && editing !== null ? (
        <form
          className="panel mb-6 grid gap-4 p-6 sm:grid-cols-[1fr_160px_140px_auto_auto] border-l-4 border-l-primary animate-in fade-in"
          onSubmit={(event) => {
            event.preventDefault();
            if (form.name.trim()) saveProduct.mutate();
          }}
        >
          <Input
            placeholder="Product name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            className="h-11 text-base font-medium"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price GHS"
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
            className="h-11 text-base font-medium"
          />
          <Input
            type="number"
            min="0"
            placeholder="Stock qty"
            value={form.stock}
            onChange={(event) => setForm({ ...form, stock: event.target.value })}
            className="h-11 text-base font-medium"
          />
          <Button type="submit" disabled={saveProduct.isPending} className="h-11 gap-2">
            <Check className="w-4 h-4" /> Save
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditing(null)} className="h-11">
            <X className="w-4 h-4" />
          </Button>
        </form>
      ) : null}
      {lowStock > 0 ? (
        <div className="mb-5 flex items-center gap-3 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-4 rounded-lg text-sm text-amber-900 font-semibold animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" /> 
          {lowStock} product{lowStock === 1 ? "" : "s"} need restocking
        </div>
      ) : null}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b-2 border-border bg-gradient-to-r from-primary/5 to-primary/2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-4 py-4 text-right">Price (GHS)</th>
                <th className="px-4 py-4 text-right">USD Rate</th>
                <th className="px-4 py-4 text-right">Stock</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((product, idx) => {
                const status = statusOf(product);
                return (
                  <tr key={product.id} className="hover:bg-muted/50 transition-colors duration-200 group">
                    <td className="px-6 py-4 font-medium group-hover:text-primary transition-colors">{product.name}</td>
                    <td className="px-4 py-4 text-right font-semibold">{money(priceOf(product, priceList), "GHS")}</td>
                    <td className="px-4 py-4 text-right text-muted-foreground">
                      {money(priceOf(product, priceList) / rate, "USD")}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-semibold">{product.stock ?? 0}</span>
                      {Number(product.stock ?? 0) <= 5 && Number(product.stock ?? 0) > 0 && (
                        <span className="ml-2 text-amber-600 text-xs">⚠️</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant={
                          status === "In Stock"
                            ? "secondary"
                            : status === "Disabled"
                              ? "outline"
                              : "destructive"
                        }
                        className="font-semibold"
                      >
                        {status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canManageProducts ? (
                        <div className="inline-flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => {
                              setEditing(product.id);
                              setForm({
                                name: product.name,
                                price: String(priceOf(product, priceList)),
                                stock: String(product.stock ?? 0),
                              });
                            }}
                            className="h-9 w-9 p-0"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`${enabledOf(product) ? "Disable" : "Enable"} ${product.name}`}
                            onClick={() => changeProduct.mutate({ product, action: "toggle" })}
                            className="h-9 w-9 p-0"
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => changeProduct.mutate({ product, action: "restock" })}
                            className="h-9 text-xs gap-1"
                          >
                            <PackagePlus className="w-3.5 h-3.5" /> +10
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!visible.length ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <PackagePlus className="w-8 h-8 text-muted-foreground/50" />
                      <p className="font-medium">No products match these filters</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-premium relative overflow-hidden p-6 group hover:scale-105">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          <TrendingUp className="w-4 h-4 text-primary/50 group-hover:text-primary transition-colors" />
        </div>
        <p className="font-display text-3xl font-bold text-gradient">{value}</p>
      </div>
    </div>
  );
}
