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
import { NotificationBell } from "@/components/shared/NotificationBell";

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
  const [checkoutPhase, setCheckoutPhase] = useState<"idle" | "preparing" | "redirecting" | "error">("idle");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState("COD");
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<string[]>([]);

  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  // Fetch which payment methods this station accepts (JSON string array on the
  // station). Only GCash is implemented in checkout; the rest are future.
  useEffect(() => {
    if (!stationId) return;
    fetch(`/api/stations/${stationId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          try {
            const raw = json.data.acceptedPaymentMethods;
            const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
            setAcceptedPaymentMethods(Array.isArray(arr) ? arr.map(String) : []);
          } catch {
            setAcceptedPaymentMethods([]);
          }
        }
      })
      .catch(() => {/* defaults to empty — server-side gate still applies */});
  }, [stationId]);

  const stationAcceptsGcash = acceptedPaymentMethods.length === 0 || acceptedPaymentMethods.includes("gcash");

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

  // ── GCash checkout helpers ──────────────────────────────────────────────
  // The idempotency key is persisted per order so retries reuse it, which
  // prevents duplicate PaymentIntents on PayMongo. The stored order id lets
  // a retry resume the same unpaid order instead of creating a new one.
  const gcashOrderStorageKey = `aq_gcash_order_${stationId}`;

  const getOrCreateIdempotencyKey = (orderId: string): string => {
    const key = `aq_gcash_idem_${orderId}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(key, fresh);
    return fresh;
  };

  const clearGcashCheckoutKeys = (orderId: string) => {
    sessionStorage.removeItem(`aq_gcash_idem_${orderId}`);
    sessionStorage.removeItem(gcashOrderStorageKey);
  };

  const findResumableGcashOrder = async (
    cartSubtotal: number,
  ): Promise<{ status: "paid"; orderId: string } | { status: "resume"; orderId: string } | { status: "none" }> => {
    const storedId = sessionStorage.getItem(gcashOrderStorageKey);
    if (!storedId) return { status: "none" };
    try {
      const res = await fetch(`/api/payments/orders/${storedId}`);
      const json = await res.json();
      if (!res.ok || !json.success) return { status: "none" };
      const status = String(json.data.paymentStatus || "").toUpperCase();
      if (status === "PAID") {
        sessionStorage.removeItem(gcashOrderStorageKey);
        return { status: "paid", orderId: storedId };
      }
      if (status === "FAILED" || status === "REFUNDED") {
        sessionStorage.removeItem(gcashOrderStorageKey);
        return { status: "none" };
      }
      // REQUIRES_ACTION / PENDING — resume only if the cart still matches
      // the order, otherwise the customer gets a fresh order.
      const ores = await fetch(`/api/orders/${storedId}`);
      const ojson = await ores.json();
      if (ores.ok && ojson.success && Number(ojson.data?.subtotal) === cartSubtotal) {
        return { status: "resume", orderId: storedId };
      }
      sessionStorage.removeItem(gcashOrderStorageKey);
      return { status: "none" };
    } catch {
      return { status: "none" };
    }
  };

  const initGcashPayment = useCallback(async (orderId: string) => {
    const idempotencyKey = getOrCreateIdempotencyKey(orderId);
    setCheckoutPhase("preparing");
    setCheckoutError(null);
    try {
      const payRes = await fetch("/api/payments/gcash/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No paymentMethodId — the server creates the GCash PaymentMethod
        // server-side via the PayMongo client.
        body: JSON.stringify({ orderId, idempotencyKey }),
      });
      const payResult = await payRes.json();

      if (!payRes.ok || !payResult.success) {
        setCheckoutError(payResult.error || "GCash payment could not be initialized.");
        setCheckoutPhase("error");
        setIsCheckingOut(false);
        return;
      }

      const data = payResult.data || {};
      const status = String(data.status || "").toLowerCase();

      // Payment already confirmed server-side — go straight to the order.
      if (["succeeded", "paid"].includes(status)) {
        clearGcashCheckoutKeys(orderId);
        clearCart();
        router.replace(`/orders/${orderId}`);
        return;
      }

      // Terminal failure — allow a fresh attempt (no amount was charged).
      if (["failed", "cancelled", "canceled"].includes(status)) {
        clearGcashCheckoutKeys(orderId);
        setCheckoutError("Payment failed. No amount was charged. Please try again.");
        setCheckoutPhase("error");
        setIsCheckingOut(false);
        return;
      }

      const nextAction = data.nextAction;
      if (nextAction?.type === "redirect" && nextAction.url) {
        setCheckoutPhase("redirecting");
        clearCart();
        window.location.href = nextAction.url;
        return;
      }

      // No redirect (payment still being confirmed server-side) — honest
      // pending state; never the old "contact the station" fallback.
      setCheckoutError("Payment is still being confirmed. Do not pay again — check your order for updates.");
      setCheckoutPhase("error");
      setIsCheckingOut(false);
    } catch {
      setCheckoutError("GCash payment could not be initialized. Please try again.");
      setCheckoutPhase("error");
      setIsCheckingOut(false);
    }
  }, [clearCart, router]);

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
    setCheckoutPhase("preparing");
    setCheckoutError(null);
    try {
      // Gate: this station must have enabled GCash for online payment.
      if (selectedPayment === "GCASH" && !stationAcceptsGcash) {
        setCheckoutError("This station doesn't accept online payment yet — please contact the station or choose a station that accepts GCash.");
        setCheckoutPhase("error");
        setIsCheckingOut(false);
        return;
      }

      let orderId = activeOrderId;

      // GCash: resume an existing unpaid order for this station instead of
      // creating a duplicate order or PaymentIntent on retry.
      if (!orderId && selectedPayment === "GCASH") {
        const resume = await findResumableGcashOrder(subtotal);
        if (resume.status === "paid") {
          clearCart();
          router.replace(`/orders/${resume.orderId}`);
          return;
        }
        if (resume.status === "resume") orderId = resume.orderId;
      }

      if (!orderId) {
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

        orderId = result.data.id;
        setActiveOrderId(orderId);
        sessionStorage.setItem(gcashOrderStorageKey, result.data.id);
      }

      if (selectedPayment === "GCASH") {
        if (!orderId) return;
        await initGcashPayment(orderId);
        return;
      }

      // COD — unchanged behavior.
      toast.success("Order placed successfully! I-monitor ang iyong order.");
      clearCart();
      router.replace("/orders");
    } catch (err) {
      const message = err instanceof Error ? err.message : "May error sa pag-process ng order. Pakisubukan muli.";
      setCheckoutError(message);
      setCheckoutPhase("error");
      setIsCheckingOut(false);
    }
  }, [session, stationId, items, selectedAddressId, selectedPayment, subtotal, clearCart, router, activeOrderId, initGcashPayment, stationAcceptsGcash]);

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
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-card sticky top-0 z-30 border-b border-border px-4 py-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-card-foreground flex-1">{MESSAGES.myCart}</h1>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Link href="/" aria-label="Home">
            <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>
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
              disabled={method.id === "GCASH" && !stationAcceptsGcash}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors min-h-[48px] ${
                method.id === "GCASH" && !stationAcceptsGcash
                  ? "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed"
                  : selectedPayment === method.id
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                    : "bg-card border-border hover:bg-muted"
              }`}
              aria-label={method.label}
              aria-disabled={method.id === "GCASH" && !stationAcceptsGcash}
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
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 mt-2 space-y-1">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                You'll be redirected to GCash to authorize the payment after placing your order.
                Your order will only be processed once payment is confirmed.
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Includes processing fee (2.23%) + service fee (1.5%), paid by the station.
              </p>
            </div>
          )}
          {!stationAcceptsGcash && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-3 mt-2">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                This station doesn't accept online payment yet — please contact the station or choose a station that accepts GCash.
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
            {checkoutPhase === "error" && activeOrderId && selectedPayment === "GCASH" && (
              <div className="flex gap-2 justify-center mt-4">
                <Button
                  className="rounded-xl min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  onClick={() => initGcashPayment(activeOrderId)}
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl min-h-[44px]"
                  onClick={() => router.replace(`/orders/${activeOrderId}`)}
                >
                  View Order
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Checkout Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-40">
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
                {checkoutPhase === "redirecting" ? "Redirecting to GCash..." : MESSAGES.processing}
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