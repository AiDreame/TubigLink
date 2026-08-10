"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Droplets,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  ChevronRight,
  MapPin,
  ShoppingCart,
  CalendarDays,
  Wallet,
  User,
  RefreshCw,
  Star,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { MESSAGES } from "@/lib/constants";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { format } from "date-fns";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────
interface DashboardOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product?: {
    id: string;
    name: string;
    type: string;
    size: string;
    price: number;
    image: string | null;
  };
}

interface DashboardOrder {
  id: string;
  userId: string;
  stationId: string;
  status: string;
  orderType: string;
  recurringDay: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  notes: string | null;
  addressId: string;
  createdAt: string;
  items: DashboardOrderItem[];
  station?: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  };
  address?: {
    id: string;
    label: string;
    street: string;
    barangay: string;
    city: string;
    province: string;
  };
}

interface DashboardData {
  activeOrders: DashboardOrder[];
  recentOrders: DashboardOrder[];
  upcomingScheduled: DashboardOrder[];
  stats: {
    activeOrdersCount: number;
    addressesCount: number;
    paymentMethodsCount: number;
    scheduledCount: number;
  };
}

// ─── Helpers ──────────────────────────────────────
const getStatusColor = (status: string) => {
  switch (status) {
    case "DELIVERED": return "bg-green-100 text-green-700 border-green-200";
    case "CANCELLED": return "bg-red-100 text-red-700 border-red-200";
    case "OUT_FOR_DELIVERY": return "bg-blue-100 text-blue-700 border-blue-200";
    case "ACCEPTED": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "PREPARING": return "bg-amber-100 text-amber-700 border-amber-200";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "DELIVERED": return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
    case "OUT_FOR_DELIVERY": return <Truck className="h-4 w-4" aria-hidden="true" />;
    case "PREPARING": return <Package className="h-4 w-4" aria-hidden="true" />;
    case "PENDING": return <Clock className="h-4 w-4" aria-hidden="true" />;
    default: return <Package className="h-4 w-4" aria-hidden="true" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "PENDING": return "Pending";
    case "ACCEPTED": return "Accepted";
    case "PREPARING": return "Preparing";
    case "OUT_FOR_DELIVERY": return "Out for Delivery";
    case "DELIVERED": return "Delivered";
    case "CANCELLED": return "Cancelled";
    default: return status.replace(/_/g, " ");
  }
};

const getStatusProgress = (status: string) => {
  const steps = ["PENDING", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
  const idx = steps.indexOf(status);
  return idx >= 0 ? ((idx + 1) / steps.length) * 100 : 0;
};

// ─── Main Page ────────────────────────────────────
export default function MyDashboardPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [redirectingOrderId, setRedirectingOrderId] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchDashboard = async () => {
    if (sessionStatus !== "authenticated" || !session?.user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customer/dashboard?userId=${session.user.id}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || "Hindi makuha ang data");
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Hindi makuha ang iyong dashboard. Pakisubukan muli.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (sessionStatus !== "authenticated") return;
    try {
      const res = await fetch("/api/notifications?onlyUnread=true&limit=1");
      if (res.ok) {
        const json = await res.json();
        setUnreadNotifications(json.unreadCount || 0);
      }
    } catch {
      // Silently fail — notification count is non-critical
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.id) {
      fetchDashboard();
      fetchUnreadCount();
    } else if (sessionStatus === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/my");
    }
  }, [sessionStatus, session?.user?.id]);

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/reorder`, { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Reorder failed");

      const order = json.data;
      const isGcash = String(order?.paymentMethod || "").toUpperCase() === "GCASH";

      // GCash reorders must be paid — mirror the cart checkout flow: persist
      // the new order id so an abandoned payment can be resumed, reuse/mint an
      // idempotency key, then initialize the PayMongo intent and redirect.
      if (json.nextAction === "INITIALIZE_PAYMENT" && isGcash && order?.id) {
        const stationId: string | undefined = order.stationId;
        if (stationId) sessionStorage.setItem(`aq_gcash_order_${stationId}`, order.id);
        const idemKey = `aq_gcash_idem_${order.id}`;
        let idempotencyKey = sessionStorage.getItem(idemKey);
        if (!idempotencyKey) {
          idempotencyKey = crypto.randomUUID();
          sessionStorage.setItem(idemKey, idempotencyKey);
        }

        let payResult: any;
        try {
          const payRes = await fetch("/api/payments/gcash/intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id, idempotencyKey }),
          });
          payResult = await payRes.json();
        } catch {
          payResult = { success: false, error: "GCash payment could not be initialized. Please try again." };
        }

        const payStatus = String(payResult?.data?.status || "").toLowerCase();

        // Payment already confirmed server-side — go straight to the order.
        if (payResult?.success && ["succeeded", "paid"].includes(payStatus)) {
          sessionStorage.removeItem(idemKey);
          if (stationId) sessionStorage.removeItem(`aq_gcash_order_${stationId}`);
          toast.success(MESSAGES.reorderSuccess);
          fetchDashboard();
          router.replace(`/orders/${order.id}`);
          return;
        }

        const nextAction = payResult?.data?.nextAction;
        if (payResult?.success && nextAction?.type === "redirect" && nextAction.url) {
          toast.success(MESSAGES.reorderSuccess);
          fetchDashboard();
          setRedirectingOrderId(order.id);
          // Redirecting to GCash to complete payment...
          window.location.href = nextAction.url;
          return;
        }

        // Payment couldn't be initialized — the order is still placed. The
        // customer can retry from the cart (sessionStorage resume) or the
        // order page once the PayMongo wallet gate is lifted.
        toast.error(
          payResult?.error ||
            "Order placed, but GCash payment could not be started. You can complete it from your cart."
        );
        fetchDashboard();
        return;
      }

      // COD (and anything else) — no payment step.
      toast.success(MESSAGES.reorderSuccess);
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message || MESSAGES.reorderFailed);
    } finally {
      setReorderingId(null);
    }
  };

  const userName = (session?.user as any)?.name || "Customer";
  const userInitial = userName.charAt(0).toUpperCase();

  // ── Loading State ──
  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && isLoading && !data)) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <HeaderSkeleton />
        <main className="max-w-3xl mx-auto p-4 space-y-4">
          {/* Greeting skeleton */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border" role="status" aria-label={MESSAGES.loadingDashboard}>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          {/* Quick stats skeleton */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 shadow-sm border">
                <Skeleton className="h-8 w-8 rounded-full mb-2" />
                <Skeleton className="h-4 w-12 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          {/* CTA skeleton */}
          <Skeleton className="h-16 w-full rounded-2xl" />
          {/* Active orders skeleton */}
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-sm border">
              <Skeleton className="h-5 w-40 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
          <span className="sr-only">{MESSAGES.loadingDashboard}</span>
        </main>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="bg-card sticky top-0 z-30 border-b px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.push("/")} aria-label="Go back to home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{MESSAGES.myDashboard}</h1>
        </div>
        <main className="max-w-3xl mx-auto p-4">
          <ErrorState
            title="Hindi ma-load ang dashboard"
            message={error}
            onRetry={fetchDashboard}
          />
        </main>
      </div>
    );
  }

  const activeOrders = data?.activeOrders || [];
  const recentOrders = data?.recentOrders || [];
  const upcomingScheduled = data?.upcomingScheduled || [];
  const stats = data?.stats || { activeOrdersCount: 0, addressesCount: 0, paymentMethodsCount: 0, scheduledCount: 0 };
  const deliveredOrdersOnly = recentOrders.filter((o) => o.status === "DELIVERED");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ── */}
      <header className="bg-card sticky top-0 z-30 border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {userInitial}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{MESSAGES.myDashboard}</p>
              <h1 className="font-bold text-foreground text-lg leading-tight">
                {MESSAGES.welcomeUser.replace("{name}", userName.split(" ")[0])}
              </h1>
            </div>
          </div>
          <NotificationBell className="hidden sm:block" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-5">
        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/orders"
            className="bg-card rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow touch-target flex flex-col items-center text-center"
            aria-label={`${stats.activeOrdersCount} active orders`}
          >
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
              <Package className="h-5 w-5 text-blue-600" aria-hidden="true" />
            </div>
            <p className="text-xl font-bold text-foreground">{stats.activeOrdersCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{MESSAGES.activeOrders}</p>
          </Link>

          <Link
            href="/my/scheduled"
            className="bg-card rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow touch-target flex flex-col items-center text-center"
            aria-label={`${stats.scheduledCount} scheduled deliveries`}
          >
            <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center mb-2">
              <CalendarDays className="h-5 w-5 text-purple-600" aria-hidden="true" />
            </div>
            <p className="text-xl font-bold text-foreground">{stats.scheduledCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Scheduled</p>
          </Link>

          <Link
            href="/profile/addresses"
            className="bg-card rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow touch-target flex flex-col items-center text-center"
            aria-label={`${stats.addressesCount} addresses`}
          >
            <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
              <MapPin className="h-5 w-5 text-green-600" aria-hidden="true" />
            </div>
            <p className="text-xl font-bold text-foreground">{stats.addressesCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Addresses</p>
          </Link>
        </div>

        {/* ── Big "Order Water Now" CTA ── */}
        <Link
          href="/stations"
          className="block bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all touch-target"
          aria-label="Order water now"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-card/20 flex items-center justify-center">
                <ShoppingCart className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <div className="text-white">
                <h2 className="text-lg font-bold">Order Water Now</h2>
                <p className="text-sm text-blue-100">Tubig sa iyong pintuan. Sulit, mabilis.</p>
              </div>
            </div>
            <ChevronRight className="h-6 w-6 text-white/70" aria-hidden="true" />
          </div>
        </Link>

        {/* ── Active Orders ── */}
        {activeOrders.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" aria-hidden="true" />
                {MESSAGES.activeOrders}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 text-xs font-medium rounded-xl min-h-[44px]"
                onClick={() => router.push("/orders")}
              >
                {MESSAGES.viewAll}
                <ChevronRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
              </Button>
            </div>

            <div className="space-y-3">
              {activeOrders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  className="bg-card rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer"
                  onClick={() => router.push(`/orders/${order.id}`)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Active order from ${order.station?.name || "station"}`}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/orders/${order.id}`)}
                >
                  <div className="p-4">
                    {/* Top row: station info + status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm">
                          {order.station?.name?.[0] || "S"}
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground text-sm">{order.station?.name || "Water Station"}</h3>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <FileText className="h-3 w-3" aria-hidden="true" />
                            {MESSAGES.orderNumber}{order.id.slice(-6).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Badge className={`rounded-lg flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-muted rounded-full h-1.5 mb-3 overflow-hidden" role="progressbar" aria-valuenow={getStatusProgress(order.status)} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${getStatusProgress(order.status)}%` }}
                      />
                    </div>

                    {/* Items preview */}
                    <div className="bg-background rounded-xl p-3 mb-3">
                      {order.items?.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm py-0.5">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Droplets className="h-3.5 w-3.5 text-blue-500 shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.product?.name || "Water"} x{item.quantity}</span>
                          </span>
                          <span className="font-medium text-foreground">₱{item.unitPrice * item.quantity}</span>
                        </div>
                      ))}
                      {(order.items?.length || 0) > 2 && (
                        <p className="text-xs text-muted-foreground mt-1">+{order.items!.length - 2} more items</p>
                      )}
                    </div>

                    {/* Delivery address + total */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate max-w-[55%]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{order.address?.barangay || order.address?.street || "Address"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}</span>
                        <span className="font-bold text-blue-600 text-sm">₱{order.total}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Delivered / Recent Orders (with Reorder) ── */}
        {deliveredOrdersOnly.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-green-600" aria-hidden="true" />
                {MESSAGES.deliveredOrders}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 text-xs font-medium rounded-xl min-h-[44px]"
                onClick={() => router.push("/orders")}
              >
                {MESSAGES.viewAll}
                <ChevronRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
              </Button>
            </div>

            <div className="space-y-3">
              {deliveredOrdersOnly.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="bg-card rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground text-sm">{order.station?.name || "Water Station"}</h3>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {format(new Date(order.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-foreground">₱{order.total}</span>
                    </div>

                    {/* Items preview */}
                    <div className="bg-background rounded-xl p-2.5 mb-3">
                      {order.items?.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Droplets className="h-3 w-3 text-blue-400 shrink-0" aria-hidden="true" />
                            {item.product?.name || "Water"} x{item.quantity}
                          </span>
                          <span className="font-medium">₱{item.unitPrice * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Reorder button */}
                    <Button
                      className="w-full rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-sm font-medium touch-target"
                      onClick={() => handleReorder(order.id)}
                      disabled={reorderingId === order.id}
                      aria-label={`${MESSAGES.orderAgain} from ${order.station?.name || "station"}`}
                    >
                      {reorderingId === order.id ? (
                        <>{MESSAGES.reordering}...</>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                          {MESSAGES.orderAgain}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Empty State (New Customer) ── */}
        {!isLoading && activeOrders.length === 0 && deliveredOrdersOnly.length === 0 && (
          <EmptyState
            icon={Droplets}
            title={MESSAGES.noOrdersYet}
            message={MESSAGES.noOrdersYetDesc}
            action={{
              label: MESSAGES.orderWaterNow,
              href: "/stations",
            }}
            secondaryAction={{
              label: MESSAGES.browseStations,
              onClick: () => router.push("/stations"),
            }}
          />
        )}

        {/* ── Quick Links ── */}
        <section>
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" aria-hidden="true" />
            {MESSAGES.quickLinks}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/my/scheduled"
              className="bg-card rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow touch-target flex items-center gap-3"
              aria-label={MESSAGES.myScheduled}
            >
              <div className="h-11 w-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-purple-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{MESSAGES.myScheduled}</p>
                <p className="text-[10px] text-muted-foreground">Set recurring water delivery</p>
              </div>
            </Link>

            <Link
              href="/my/payment-methods"
              className="bg-card rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow touch-target flex items-center gap-3"
              aria-label={MESSAGES.myPaymentMethods}
            >
              <div className="h-11 w-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-green-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{MESSAGES.myPaymentMethods}</p>
                <p className="text-[10px] text-muted-foreground">GCash, Card, COD</p>
              </div>
            </Link>

            <Link
              href="/orders"
              className="bg-card rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow touch-target flex items-center gap-3"
              aria-label={MESSAGES.myOrders}
            >
              <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{MESSAGES.myOrders}</p>
                <p className="text-[10px] text-muted-foreground">Track and view orders</p>
              </div>
            </Link>

            <Link
              href="/profile"
              className="bg-card rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow touch-target flex items-center gap-3"
              aria-label="Profile"
            >
              <div className="h-11 w-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-orange-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">Profile</p>
                <p className="text-[10px] text-muted-foreground">Manage your account</p>
              </div>
            </Link>
          </div>
        </section>
      </main>

      {/* Honest interim state while the browser follows the GCash checkout URL */}
      {redirectingOrderId && (
        <div
          className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-6"
          role="status"
          aria-live="polite"
        >
          <div className="bg-card rounded-2xl p-6 shadow-lg border max-w-sm w-full text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" aria-hidden="true" />
            <p className="font-bold text-foreground">Redirecting to GCash to complete payment...</p>
            <p className="text-sm text-muted-foreground">
              You'll be asked to authorize the payment in GCash. Don't close this window.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Header ──────────────────────────────
function HeaderSkeleton() {
  return (
    <header className="bg-card sticky top-0 z-30 border-b px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-3 w-20 mb-1" />
            <Skeleton className="h-5 w-36" />
          </div>
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </header>
  );
}
