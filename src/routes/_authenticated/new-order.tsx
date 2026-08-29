import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { 
  CreditCard, Plus, ShoppingCart, Trash2, ChevronRight, Check, Package, 
  Store, Warehouse, ArrowRight, CheckCircle, Clock, Zap, Package2, AlertCircle 
} from "lucide-react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchTable, createRow, type Product } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/new-order")({
  head: () => ({ meta: [{ title: "New Order | EMD Inventory" }] }),
  component: NewOrderPage,
});

type OrderType = "repurchase" | "new registration";
type CustomerType = "retail" | "distributor" | null;
type Step = 1 | 2 | 3 | 4;

type CartItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  type?: "retail" | "distributor";
};

const money = (value: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);

function NewOrderPage() {
  const queryClient = useQueryClient();
  const { data: products = [] } = useSuspenseQuery({
    queryKey: ["products"],
    queryFn: () => fetchTable<Product>("products"),
  });
  
  const firstProduct = products[0];
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [customerType, setCustomerType] = useState<CustomerType>(null);
  const [orderType, setOrderType] = useState<OrderType>("repurchase");
  const [customerName, setCustomerName] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("Starter Kit");
  const [productId, setProductId] = useState(firstProduct?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  
  const registrationPackages = [
    { name: "Starter Kit", fee: 120, commission: 40, total: 280 },
    { name: "Business Bundle", fee: 220, commission: 70, total: 540 },
    { name: "Premium Reg", fee: 350, commission: 90, total: 820 },
  ];

  const selectedPkg = registrationPackages.find((pkg) => pkg.name === selectedPackage) ?? registrationPackages[0];

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const registrationFee = orderType === "new registration" ? selectedPkg.fee : 0;
  const grandTotal = subtotal + registrationFee;

  const sku = useMemo(() => {
    const found = products.find((item) => item.id === productId);
    if (!found) return null;
    return found;
  }, [productId, products]);

  const filteredProducts = useMemo(() => {
    if (!customerType) return products;
    return products.filter((p) => {
      if (customerType === "retail") {
        return p.retail_price && p.retail_price > 0;
      } else {
        return p.distributor_price && p.distributor_price > 0;
      }
    });
  }, [products, customerType]);

  const getProductPrice = (product: Product): number => {
    if (customerType === "retail") {
      return product.retail_price || product.price || 0;
    } else if (customerType === "distributor") {
      return product.distributor_price || product.price || 0;
    }
    return product.price || 0;
  };

  const addItem = () => {
    if (!sku || !customerType) return;
    const nextQty = Math.max(1, Number(quantity) || 1);
    const price = getProductPrice(sku);
    
    if (price <= 0) {
      toast.error("Product price not available for selected customer type");
      return;
    }

    setCart((current) => {
      const match = current.find((item) => item.id === sku.id);
      if (match) {
        return current.map((item) =>
          item.id === sku.id ? { ...item, quantity: item.quantity + nextQty } : item,
        );
      }
      return [...current, { id: sku.id, name: sku.name, quantity: nextQty, price, type: customerType }];
    });
    setQuantity("1");
    toast.success(`Added ${sku.name} to cart`);
  };

  const removeItem = (id: string) => {
    setCart((current) => current.filter((item) => item.id !== id));
    toast.success("Item removed from cart");
  };

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const saveOrderMutation = useMutation({
    mutationFn: async () => {
      if (!customerName.trim() || !destination.trim() || cart.length === 0) {
        throw new Error("Please fill in all required fields and add items to cart");
      }

      const orderData = {
        customer_name: customerName,
        destination,
        order_type: orderType,
        customer_type: customerType,
        subtotal,
        registration_fee: registrationFee,
        total: grandTotal,
        cart_items: JSON.stringify(cart),
        order_date: orderDate,
        status: "pending",
      };

      return await createRow("orders", orderData);
    },
    onSuccess: () => {
      toast.success("Order saved successfully!");
      setCart([]);
      setCustomerName("");
      setDestination("");
      setCurrentStep(1);
      setCustomerType(null);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save order");
    },
  });

  const canProceedStep1 = customerType !== null;
  const canProceedStep2 = customerName.trim() !== "" && destination.trim() !== "";
  const canProceedStep3 = cart.length > 0;

  const handleNextStep = () => {
    if (currentStep === 1 && !canProceedStep1) {
      toast.error("Please select customer type");
      return;
    }
    if (currentStep === 2 && !canProceedStep2) {
      toast.error("Please fill in customer name and destination");
      return;
    }
    if (currentStep === 3 && !canProceedStep3) {
      toast.error("Please add items to cart");
      return;
    }
    if (currentStep < 4) setCurrentStep((currentStep + 1) as Step);
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as Step);
  };

  const handleConfirmOrder = () => {
    saveOrderMutation.mutate();
  };

  return (
    <AppShell title="New Order" description="Create a fresh order in a modern, step-by-step flow">
      <div className="mx-auto max-w-6xl">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all duration-300 ${
                  step === currentStep 
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg scale-110" 
                    : step < currentStep 
                    ? "bg-emerald-500 text-white" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step < currentStep ? <Check className="w-5 h-5" /> : step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-1 mx-1 sm:mx-2 transition-all duration-300 ${
                    step < currentStep ? "bg-emerald-500" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground px-1">
            <span>Customer</span>
            <span>Details</span>
            <span>Products</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* Step 1: Customer Type Selection */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="panel p-8 md:p-12">
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Welcome to EMD Orders</h2>
                <p className="text-lg text-muted-foreground">Let's start by selecting your customer type</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Retail Card */}
                <div
                  onClick={() => setCustomerType("retail")}
                  className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300 p-8 ${
                    customerType === "retail"
                      ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg scale-105"
                      : "border-border hover:border-primary/50 hover:shadow-md hover:scale-102"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <div className={`flex items-center justify-center w-16 h-16 rounded-2xl mb-6 transition-all duration-300 ${
                      customerType === "retail"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    }`}>
                      <Store className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Retail</h3>
                    <p className="text-muted-foreground mb-4">Perfect for small to medium shops and resellers</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        <span>Standard retail pricing</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        <span>Quick order processing</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>Fast delivery options</span>
                      </li>
                    </ul>
                    {customerType === "retail" && (
                      <div className="mt-4 inline-block">
                        <Badge className="bg-primary/20 text-primary border border-primary/30">Selected</Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Distributor Card */}
                <div
                  onClick={() => setCustomerType("distributor")}
                  className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300 p-8 ${
                    customerType === "distributor"
                      ? "border-emerald-500 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 shadow-lg scale-105"
                      : "border-border hover:border-emerald-500/50 hover:shadow-md hover:scale-102"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <div className={`flex items-center justify-center w-16 h-16 rounded-2xl mb-6 transition-all duration-300 ${
                      customerType === "distributor"
                        ? "bg-emerald-500/20 text-emerald-600"
                        : "bg-muted text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-600"
                    }`}>
                      <Warehouse className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Distributor</h3>
                    <p className="text-muted-foreground mb-4">Ideal for wholesale and large-scale operations</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-600" />
                        <span>Wholesale pricing available</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-600" />
                        <span>Bulk order handling</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span>Priority support</span>
                      </li>
                    </ul>
                    {customerType === "distributor" && (
                      <div className="mt-4 inline-block">
                        <Badge className="bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">Selected</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button 
                  onClick={handleNextStep}
                  disabled={!canProceedStep1}
                  className="gap-2 px-8"
                  size="lg"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Order Details */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="panel p-8 md:p-12">
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Order Details</h2>
                <p className="text-lg text-muted-foreground">Provide your customer and delivery information</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm font-semibold">Order Date</label>
                  <Input 
                    type="date" 
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-sm font-semibold">Order Type</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as OrderType)}
                    className="h-12 w-full rounded-lg border border-input bg-background px-4 text-base font-medium transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="repurchase">Repurchase</option>
                    <option value="new registration">New Registration</option>
                  </select>
                </div>
                <div>
                  <label className="mb-3 block text-sm font-semibold">Customer Name *</label>
                  <Input 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-sm font-semibold">Destination *</label>
                  <Input 
                    value={destination} 
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Delivery location"
                    className="h-12 text-base"
                  />
                </div>
              </div>

              {orderType === "new registration" && (
                <div className="mt-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
                  <label className="mb-3 block text-sm font-semibold">Registration Package</label>
                  <div className="grid gap-3">
                    {registrationPackages.map((pkg) => (
                      <div
                        key={pkg.name}
                        onClick={() => setSelectedPackage(pkg.name)}
                        className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
                          selectedPackage === pkg.name
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{pkg.name}</p>
                            <p className="text-sm text-muted-foreground">Fee: {money(pkg.fee)} | Commission: {money(pkg.commission)}</p>
                          </div>
                          <Badge className="text-lg">{money(pkg.total)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={handlePrevStep}
                  className="gap-2"
                  size="lg"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleNextStep}
                  disabled={!canProceedStep2}
                  className="gap-2"
                  size="lg"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Product Selection */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="panel p-8">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2">Select Products</h2>
                    <p className="text-lg text-muted-foreground">Choose items from the {customerType} product list</p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-3 block text-sm font-semibold">Product</label>
                        <select
                          value={productId}
                          onChange={(e) => setProductId(e.target.value)}
                          className="h-12 w-full rounded-lg border border-input bg-background px-4 text-base transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                          <option value="">Select a product</option>
                          {filteredProducts.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-3 block text-sm font-semibold">Quantity</label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={quantity} 
                          onChange={(e) => setQuantity(e.target.value)}
                          className="h-12 text-base"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={addItem}
                          className="w-full h-12 gap-2"
                        >
                          <Plus className="w-4 h-4" /> Add to Cart
                        </Button>
                      </div>
                    </div>
                  </div>

                  {sku && (
                    <div className="mb-6 rounded-lg border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{sku.name}</p>
                        <p className="text-sm text-muted-foreground">Stock: {sku.stock} units available</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-2xl font-bold text-primary">{money(getProductPrice(sku))}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {cart.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Your cart is empty. Add products to proceed.</p>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold mt-6">Cart Items ({cart.length})</h3>
                        {cart.map((item, idx) => (
                          <div key={item.id} className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:shadow-md transition-all duration-200">
                            <div className="flex-1">
                              <p className="font-semibold">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.quantity} × {money(item.price)} = {money(item.quantity * item.price)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Cart Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="panel p-6 sticky top-20">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-1">Order Summary</h3>
                    <Badge variant="outline">{cart.length} items</Badge>
                  </div>

                  <div className="space-y-3 text-sm border-b border-border pb-4 mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">{money(subtotal)}</span>
                    </div>
                    {orderType === "new registration" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Registration</span>
                        <span className="font-semibold">{money(registrationFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{money(grandTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs mb-6 p-4 bg-muted/50 rounded-lg">
                    <p><span className="font-semibold">Customer:</span> {customerName}</p>
                    <p><span className="font-semibold">Type:</span> {customerType}</p>
                    <p><span className="font-semibold">Destination:</span> {destination}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline"
                      onClick={handlePrevStep}
                      className="w-full"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleNextStep}
                      disabled={!canProceedStep3}
                      className="w-full gap-2"
                    >
                      Review Order <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="panel p-8 md:p-12">
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Confirm & Save Order</h2>
                <p className="text-lg text-muted-foreground">Review your order before confirming</p>
              </div>

              <div className="grid gap-6 md:grid-cols-3 mb-8">
                {/* Order Summary */}
                <div className="md:col-span-2 space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Package2 className="w-5 h-5 text-primary" />
                      Order Details
                    </h3>
                    <div className="grid gap-4 text-sm">
                      <div className="flex justify-between pb-2 border-b border-border">
                        <span className="text-muted-foreground">Customer Name</span>
                        <span className="font-semibold">{customerName}</span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-border">
                        <span className="text-muted-foreground">Customer Type</span>
                        <Badge variant="outline" className="capitalize">{customerType}</Badge>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-border">
                        <span className="text-muted-foreground">Order Type</span>
                        <span className="font-semibold capitalize">{orderType}</span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-border">
                        <span className="text-muted-foreground">Destination</span>
                        <span className="font-semibold">{destination}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order Date</span>
                        <span className="font-semibold">{orderDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      Order Items ({cart.length})
                    </h3>
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.quantity} × {money(item.price)}</p>
                          </div>
                          <p className="font-bold text-lg">{money(item.quantity * item.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Final Total */}
                <div className="md:col-span-1">
                  <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 sticky top-20">
                    <div className="mb-6">
                      <p className="text-muted-foreground text-sm mb-1">Final Amount</p>
                      <p className="text-4xl font-bold text-primary">{money(grandTotal)}</p>
                    </div>

                    <div className="space-y-2 text-sm pb-6 border-b border-primary/20 mb-6">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-semibold">{money(subtotal)}</span>
                      </div>
                      {registrationFee > 0 && (
                        <div className="flex justify-between">
                          <span>Registration</span>
                          <span className="font-semibold">{money(registrationFee)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold text-emerald-700">Ready to save</p>
                          <p className="text-emerald-600/80">All details verified</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button 
                        onClick={handlePrevStep}
                        variant="outline"
                        className="w-full"
                        disabled={saveOrderMutation.isPending}
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={handleConfirmOrder}
                        className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                        disabled={saveOrderMutation.isPending}
                        size="lg"
                      >
                        {saveOrderMutation.isPending ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" /> Confirm & Save Order
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
