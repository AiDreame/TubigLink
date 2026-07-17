"use client";

import { useCart } from "@/hooks/use-cart";
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ChevronRight,
  MapPin,
  CreditCard,
  AlertCircle,
  Smartphone,
  Wallet,
  Check,
  Home
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { MESSAGES, PAYMENT_METHODS } from "@/lib/constants";

interface Address {
  id: string;
  label: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  isDefault: boolean;
}

export default function CartPage() {
  const { items, stationId, stationName, subtotal, removeItem, updateQuantity, clearCart } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState("COD");

  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  // Fetch user addresses on mount
  useEffect(() => {
    const user = session?.user as any;
    if (!user?.id) return;
    fetch(`/api/addresses?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.data || data || [];
        setAddresses(list);
        const defaultAddr = list.find((a: Address) => a.isDefault) || list[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      })
      .catch(() => {/* addresses are optional */})
      .finally(() => setLoadingAddresses(false));
  }, [session]);

  const handleCheckout = useCallback(async () => {
    if (!session?.user) {
      router.replace("/auth/login");
      return;
    }
    if (!stationId || items.length === 0) {
      setCheckoutError("Your cart is empty. Please add items before checking out.");
      return;
    }
    if (!selectedAddressId) {
      setCheckoutError("Please add a delivery address in your profile before placing an order.");
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);
    try {
      const body = {
        userId: (session.user as any).id,
        stationId,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        addressId: selectedAddressId,
        paymentMethod: selectedPayment,
        orderType: "ONCE",
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to create order");
      }

      const order = result.data;

      // If GCash, create PayMongo source and redirect to GCash checkout
      if (selectedPayment === "GCASH") {
        const payRes = await fetch("/api/payments/create-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: order.total,
            orderId: order.id,
            description: `AquaLink PH Order #${order.id.slice(-8)}`,
          }),
        });

        const payResult = await payRes.json();

        if (!payRes.ok || !payResult.success) {
          // Order created but payment init failed — fall back gracefully
          toast.error("Order placed! GCash payment could not be initiated. Please contact the station.");
          clearCart();
          router.replace(`/orders/${order.id}`);
          return;
        }

        // Redirect to official GCash checkout page via PayMongo
        const checkoutUrl = payResult.data.checkout_url;
        if (checkoutUrl) {
          clearCart();
          window.location.href = checkoutUrl;
          return;
        }
      }

      // COD or GCash without redirect fallback
      toast.success("Order placed successfully! I-monitor ang iyong order.");
      clearCart();
      router.replace("/orders");
    } catch (err) {
      const message = err instanceof Error ? err.message : "May error sa pag-process ng order. Pakisubukan muli.";
      setCheckoutError(message);
      setIsCheckingOut(false);
    }
  }, [session, stationId, items, selectedAddressId, selectedPayment, clearCart, router]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-24 w-24 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-6">
          <ShoppingBag className="h-12 w-12 text-blue-200 dark:text-blue-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{MESSAGES.cartEmpty}</h1>
        <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
          {MESSAGES.cartEmptyDesc}
        </p>
        <Button asChild className="mt-8 rounded-2xl px-8 h-12">
          <Link href="/stations">{MESSAGES.browseStations}</Link>
        </Button>
        <Button asChild className="mt-8 rounded-2xl px-8 h-12" variant="outline">
          <Link href="/">{MESSAGES.goHome}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="bg-card sticky top-0 z-30 border-b border-border px-4 py-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-card-foreground flex-1">{MESSAGES.myCart}</h1>
        <Link href="/" aria-label="Home">
          <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]">
            <Home className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Station Info */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              {stationName?.[0]}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{MESSAGES.orderingFrom}</p>
              <p className="font-bold text-card-foreground">{stationName}</p>
            </div>
          </div>
          <Link href="/stations">
            <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 text-xs min-h-[44px]">
              {MESSAGES.change}
            </Button>
          </Link>
        </div>

        {/* Cart Items */}
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-card-foreground">{MESSAGES.orderSummary}</h2>
          </div>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.product.id} className="p-4 flex gap-4">
                <div className="h-16 w-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
                  💧
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-card-foreground truncate">{item.product.name}</h3>
                    <button 
                      onClick={() => removeItem(item.product.id)}
                      className="text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.product.size}</p>
                  
                  <div className="flex justify-between items-center mt-3">
                    <span className="font-bold text-blue-600 dark:text-blue-400">₱{item.product.price * item.quantity}</span>
                    <div className="flex items-center bg-muted rounded-lg p-1" role="group" aria-label={`Quantity for ${item.product.name}`}>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:bg-card rounded-md transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-card-foreground" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:bg-card rounded-md transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Details */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-4">
          <h2 className="font-bold text-card-foreground">{MESSAGES.deliveryDetails}</h2>
          {loadingAddresses ? (
            <div className="animate-pulse bg-muted rounded-xl h-16" />
          ) : addresses.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-900/30 text-center">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">No delivery address found.</p>
              <Link href="/profile/addresses">
                <Button variant="outline" size="sm" className="text-xs min-h-[44px] rounded-xl">
                  Add Address
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors min-h-[44px] ${
                    selectedAddressId === addr.id
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                      : "bg-card border-border hover:bg-muted"
                  }`}
                  aria-label={`Select address: ${addr.label}, ${addr.street}, ${addr.barangay}`}
                >
                  <MapPin className={`h-5 w-5 shrink-0 mt-0.5 ${selectedAddressId === addr.id ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-card-foreground">{addr.label}</p>
                    <p className="text-xs text-muted-foreground">{addr.street}, {addr.barangay}, {addr.city}</p>
                  </div>
                  {selectedAddressId === addr.id && (
                    <Badge className="bg-blue-600 text-white text-[10px]">Selected</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-2">
          <h2 className="font-bold text-card-foreground mb-3">{MESSAGES.paymentMethod}</h2>
          {PAYMENT_METHODS.filter(p => p.id === "COD" || p.id === "GCASH").map((method) => (
            <button
              key={method.id}
              onClick={() => setSelectedPayment(method.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors min-h-[48px] ${
                selectedPayment === method.id
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                  : "bg-card border-border hover:bg-muted"
              }`}
              aria-label={method.label}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                method.id === "GCASH" ? "bg-blue-50 dark:bg-blue-900/30" : "bg-green-50 dark:bg-green-900/30"
              }`}>
                {method.id === "GCASH" ? (
                  <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                ) : (
                  <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-card-foreground">{method.icon} {method.label}</p>
                <p className="text-xs text-muted-foreground">{method.description}</p>
              </div>
              {selectedPayment === method.id && (
                <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          ))}
          {selectedPayment === "GCASH" && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 mt-2">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                You'll be redirected to GCash to complete payment after placing your order. 
                Your order will be processed once payment is confirmed.
              </p>
            </div>
          )}
        </div>

        {/* Total Bill */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{MESSAGES.subtotal}</span>
            <span className="font-medium text-card-foreground">₱{subtotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{MESSAGES.deliveryFee}</span>
            <span className="font-medium text-green-600 dark:text-green-400">{MESSAGES.free}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold text-lg text-card-foreground">{MESSAGES.total}</span>
            <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">₱{total}</span>
          </div>
        </div>

        {/* Error Message */}
        {checkoutError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 text-center" role="alert">
            <p className="text-sm text-red-600 dark:text-red-400">{checkoutError}</p>
          </div>
        )}
      </main>

      {/* Checkout Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-40">
        <div className="max-w-3xl mx-auto">
          <Button 
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/50"
            onClick={handleCheckout}
            disabled={isCheckingOut}
            aria-label={isCheckingOut ? MESSAGES.processing : MESSAGES.placeOrder}
          >
            {isCheckingOut ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {MESSAGES.processing}
              </span>
            ) : (
              <span className="flex items-center justify-between w-full px-4">
                <span>{MESSAGES.placeOrder}</span>
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}