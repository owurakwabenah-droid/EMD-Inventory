import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Minus, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createRow,
  fetchTable,
  updateRow,
  type Customer,
  type Order,
  type OrderItem,
  type Product,
} from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { enqueue, readCache, writeCache } from "@/lib/offline";
import { supabase } from "@/lib/supabase";
import { USD_TO_GHS, catalogPrice, type PriceList } from "@/lib/product-catalog";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders | EMD Inventory" }] }),
  component: OrdersPage,
});

type Package = Record<string, unknown> & {
  id?: string;
  name?: string;
  description?: string;
  registration_fee?: unknown;
  fee?: unknown;
  product_value?: unknown;
  productValue?: unknown;
  total_price?: unknown;
  total?: unknown;
};
type CartItem = { product: Product; quantity: number; unitPrice: number };
const priceOf = (product: Product, priceList: PriceList) => catalogPrice(product, priceList);
const enabledOf = (product: Product) => {
  const row = product as unknown as Record<string, unknown>;
  return row["is_active"] !== false && String(row["status"] ?? "active") !== "disabled";
};
const money = (value: number, currency: "GHS" | "USD") =>
  new Intl.NumberFormat(currency === "GHS" ? "en-GH" : "en-US", {
    style: "currency",
    currency,
  }).format(value);
const id = () => crypto.randomUUID();

async function saveOrder(
  order: Record<string, unknown>,
  items: Record<string, unknown>[],
  movements: Record<string, unknown>[],
) {
  const orderId = String(order["id"]);
  if (!navigator.onLine) {
    enqueue({ table: "orders", op: "insert", payload: order });
    for (const item of items) enqueue({ table: "order_items", op: "insert", payload: item });
    for (const movement of movements)
      enqueue({ table: "inventory_movements", op: "insert", payload: movement });
    for (const item of items)
      enqueue({
        table: "products",
        op: "update",
        matchId: String(item["product_id"]),
        payload: { stock: item["remaining_stock"] },
      });
    writeCache("orders", [order, ...readCache("orders")]);
    writeCache("order_items", [...items, ...readCache("order_items")]);
    return true;
  }
  const { error: orderError } = await supabase.from("orders").insert(order);
  if (orderError) throw orderError;
  const { error: itemError } = await supabase.from("order_items").insert(items);
  if (itemError) throw itemError;
  if (movements.length) {
    const { error: movementError } = await supabase.from("inventory_movements").insert(movements);
    if (movementError) throw movementError;
  }
  for (const item of items) {
    const { error } = await supabase
      .from("products")
      .update({ stock: item["remaining_stock"] })
      .eq("id", item["product_id"]);
    if (error) throw error;
  }
  return false;
}

function OrdersPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchTable<Product>("products"),
  });
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchTable<Customer>("customers"),
  });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => fetchTable<Order>("orders") });
  const items = useQuery({
    queryKey: ["order_items"],
    queryFn: () => fetchTable<OrderItem>("order_items"),
  });
  const packages = useQuery({
    queryKey: ["registration_packages"],
    queryFn: () => fetchTable<Package>("registration_packages"),
  });
  const settings = useQuery({
    queryKey: ["app_settings"],
    queryFn: () => fetchTable<Record<string, unknown>>("app_settings"),
  });
  const [orderType, setOrderType] = useState<"repurchase" | "registration">("repurchase");
  const [priceList, setPriceList] = useState<PriceList>("retail");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [details, setDetails] = useState<Order | null>(null);
  const activeProducts = (products.data ?? [])
    .filter(enabledOf)
    .filter((product) => Number(product.stock ?? 0) > 0);
  const packageRow = (packages.data ?? []).find(
    (item) => String(item.id ?? item.name) === selectedPackage,
  );
  const packageRegistrationFee = packageRow
    ? Number(packageRow.registration_fee ?? packageRow.fee ?? 0)
    : 0;
  const packageProductValue = packageRow
    ? Number(packageRow.product_value ?? packageRow.productValue ?? 0)
    : 0;
  const rateRow = (settings.data ?? []).find((row) =>
    String(row["key"] ?? row["name"])
      .toLowerCase()
      .includes("usd"),
  );
  const usdRate = rateRow ? Number(rateRow["value"] ?? rateRow["setting_value"] ?? rateRow["rate"] ?? 0) : 0;
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal + (orderType === "registration" ? packageRegistrationFee : 0);
  const canSubmit =
    cart.length > 0 && cart.every((item) => item.quantity <= Number(item.product.stock ?? 0));
  const selected = activeProducts.find((product) => product.id === selectedProduct);
  const history = useMemo(
    () =>
      [...(orders.data ?? [])].sort((a, b) =>
        String(b.created_at).localeCompare(String(a.created_at)),
      ),
    [orders.data],
  );
  const addItem = () => {
    if (!selected) return;
    const amount = Math.max(1, Number(quantity) || 0);
    const existing = cart.find((item) => item.product.id === selected.id);
    const nextQuantity = (existing?.quantity ?? 0) + amount;
    if (nextQuantity > Number(selected.stock ?? 0)) {
      toast.error("Quantity exceeds available stock");
      return;
    }
    setCart(
      existing
        ? cart.map((item) =>
            item.product.id === selected.id ? { ...item, quantity: nextQuantity } : item,
          )
        : [
            ...cart,
            { product: selected, quantity: amount, unitPrice: priceOf(selected, priceList) },
          ],
    );
    setSelectedProduct("");
    setQuantity("1");
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id || !canSubmit) throw new Error("Add valid items before saving");
      const orderId = id();
      const orderNumber = `EMD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${orderId.slice(0, 8).toUpperCase()}`;
      const order = {
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId || null,
        customer_name:
          customerName ||
          customers.data?.find((customer) => customer.id === customerId)?.name ||
          null,
        destination: destination || null,
        created_by: user.id,
        order_type: orderType,
        status: "completed",
        subtotal,
        registration_fee: orderType === "registration" ? packageRegistrationFee : 0,
        total_amount: total,
        grand_total: total,
        order_date: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
      };
      const orderItems = cart.map((item) => ({
        id: id(),
        order_id: orderId,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.quantity * item.unitPrice,
        remaining_stock: Number(item.product.stock ?? 0) - item.quantity,
      }));
      const movements = cart.map((item) => ({
        id: id(),
        product_id: item.product.id,
        quantity: -item.quantity,
        movement_type: "sale",
        reference_id: orderId,
        created_by: user.id,
        created_at: new Date().toISOString(),
      }));
      return saveOrder(order, orderItems, movements);
    },
    onSuccess: (queued) => {
      setCart([]);
      setCustomerId("");
      setCustomerName("");
      setDestination("");
      setSelectedPackage("");
      void client.invalidateQueries();
      toast[queued ? "info" : "success"](
        queued ? "Order saved offline and queued for sync" : "Order saved",
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Order could not be saved"),
  });

  return (
    <AppShell title="Orders" description="Create orders and review order history">
      <div className="mb-5 flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Price list</label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={priceList}
          onChange={(event) => setPriceList(event.target.value as PriceList)}
        >
          <option value="retail">Retail prices</option>
          <option value="distributor">Distributor prices</option>
        </select>
        <span className="text-xs text-muted-foreground">$1 = GHS {USD_TO_GHS}</span>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold">New order</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Stock is checked before every item is added.
              </p>
            </div>
            <Badge variant="outline">
              {orderType === "registration" ? "Registration" : "Repurchase"}
            </Badge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Order type
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={orderType}
                onChange={(event) => setOrderType(event.target.value as typeof orderType)}
              >
                <option value="repurchase">Repurchase</option>
                <option value="registration">New Registration</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Order date
              <Input
                className="mt-1"
                type="date"
                value={new Date().toISOString().slice(0, 10)}
                readOnly
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Customer
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">Walk-in customer</option>
                {(customers.data ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Customer name
              <Input
                className="mt-1"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Optional walk-in name"
              />
            </label>
            <label className="text-xs text-muted-foreground sm:col-span-2">
              Destination
              <Input
                className="mt-1"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Delivery destination"
              />
            </label>
          </div>
          {orderType === "registration" ? (
            <label className="mt-3 block text-xs text-muted-foreground">
              Registration package
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedPackage}
                onChange={(event) => setSelectedPackage(event.target.value)}
              >
                <option value="">Choose a package</option>
                {(packages.data ?? []).map((item) => (
                  <option key={String(item.id ?? item.name)} value={String(item.id ?? item.name)}>
                    {item.name ?? "Package"} -{" "}
                    {money(Number(item.total_price ?? item.total ?? 0), "GHS")}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_110px_auto]">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedProduct}
              onChange={(event) => setSelectedProduct(event.target.value)}
            >
              <option value="">Choose available product</option>
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {money(priceOf(product, priceList), "GHS")} ({product.stock}{" "}
                  left)
                </option>
              ))}
            </select>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            <Button type="button" onClick={addItem} disabled={!selected}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border">
            {cart.map((item) => (
              <div className="flex items-center justify-between gap-3 py-3" key={item.product.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} x {money(item.unitPrice, "GHS")} ={" "}
                    {money(item.quantity * item.unitPrice, "GHS")} |{" "}
                    {Number(item.product.stock ?? 0) - item.quantity} remaining
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setCart(
                        cart.map((entry) =>
                          entry.product.id === item.product.id
                            ? { ...entry, quantity: Math.max(1, entry.quantity - 1) }
                            : entry,
                        ),
                      )
                    }
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setCart(
                        cart.map((entry) =>
                          entry.product.id === item.product.id &&
                          entry.quantity < Number(entry.product.stock ?? 0)
                            ? { ...entry, quantity: entry.quantity + 1 }
                            : entry,
                        ),
                      )
                    }
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setCart(cart.filter((entry) => entry.product.id !== item.product.id))
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {!cart.length ? (
              <p className="py-4 text-sm text-muted-foreground">Your order is empty.</p>
            ) : null}
          </div>
          {packageRow ? (
            <div className="mt-4 border-l-2 border-amber-500 pl-3 text-sm">
              <p className="font-medium">{packageRow.name}</p>
              <p className="text-muted-foreground">
                {packageRow.description ?? "Registration package"} | Product value{" "}
                {money(packageProductValue, "GHS")} | Registration fee{" "}
                {money(packageRegistrationFee, "GHS")}
              </p>
            </div>
          ) : null}
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{money(subtotal, "GHS")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registration fee</span>
              <span>{money(orderType === "registration" ? packageRegistrationFee : 0, "GHS")}</span>
            </div>
            <div className="flex justify-between font-display text-lg font-semibold">
              <span>Grand total</span>
              <span>{money(total, "GHS")}</span>
            </div>
            <p className="text-right text-xs text-muted-foreground">
              {usdRate
                ? `${money(total / usdRate, "USD")} at $1 = GHS ${usdRate}`
                : "USD rate unavailable"}
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCart([])}>
              <X className="size-4" /> Clear
            </Button>
            <Button onClick={() => save.mutate()} disabled={!canSubmit || save.isPending}>
              <Save className="size-4" /> Save order
            </Button>
          </div>
        </section>
        <section className="panel overflow-hidden">
          <div className="p-5">
            <h2 className="font-display font-semibold">Order history</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Completed and pending orders from Supabase.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-y border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-3 py-3">Date & time</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Destination</th>
                  <th className="px-3 py-3">Items</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((order) => (
                  <tr key={order.id}>
                    <td className="px-5 py-3 font-medium">
                      {order.order_number ?? order.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString("en-GH", {
                            timeZone: "Africa/Accra",
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "-"}
                    </td>
                    <td className="px-3 py-3">{order.customer_name ?? "Walk-in"}</td>
                    <td className="px-3 py-3">
                      {String((order as unknown as Record<string, unknown>)["destination"] ?? "-")}
                    </td>
                    <td className="px-3 py-3">
                      {items.data
                        ?.filter((item) => item.order_id === order.id)
                        .reduce((total, item) => total + Number(item.quantity ?? 0), 0) ?? 0}
                    </td>
                    <td className="px-3 py-3">
                      {money(
                        Number(order.total_amount ?? order.total ?? order.grand_total ?? 0),
                        "GHS",
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="secondary">{order.status ?? "pending"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Button size="sm" variant="outline" onClick={() => setDetails(order)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {!history.length ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                      No orders recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {details ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">
                Order {details.order_number ?? details.id.slice(0, 8)}
              </h2>
              <Button size="icon" variant="ghost" onClick={() => setDetails(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p>Customer: {details.customer_name ?? "Walk-in"}</p>
              <p>Status: {details.status ?? "pending"}</p>
              <p>
                Total:{" "}
                {money(
                  Number(details.total_amount ?? details.total ?? details.grand_total ?? 0),
                  "GHS",
                )}
              </p>
              <p>Created by: {details.created_by ?? "-"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
