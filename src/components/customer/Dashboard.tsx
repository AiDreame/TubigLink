"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Package, 
  ShoppingBag, 
  Clock, 
  ChevronRight, 
  MapPin, 
  CreditCard, 
  RefreshCw,
  CalendarDays,
  Droplets,
  ArrowRight,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { MESSAGES } from "@/lib/constants";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useLiveRefresh, LIVE_REFRESH_INTERVAL_MS } from "@/hooks/use-live-refresh";

interface DashboardData {
  activeOrders: any[];
  recentOrders: any[];
  upcomingScheduled: any[];
  stats: {
    activeOrdersCount: number;
    addressesCount: number;
    paymentMethodsCount: number;
    scheduledCount: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  ACCEPTED: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  PREPARING: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  OUT_FOR_DELIVERY: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300",
  DELIVERED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  CANCELLED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

const STATUS_ICONS: Record<string, string> = {
  PENDING: "🕐",
  ACCEPTED: "✅",
  PREPARING: "🫗",
  OUT_FOR_DELIVERY: "🚚",
  DELIVERED: "✅",
  CANCELLED: "❌",
};

export function CustomerDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userId = (session?.user as any)?.id;
      const url = userId ? `/api/customer/dashboard?userId=${userId}` : "/api/customer/dashboard";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || "Hindi makuha ang data");
      }
    } catch (err) {
      setError("Hindi makuha ang dashboard data. Pakisubukan muli.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Silent live refresh: re-fetches the dashboard in the background so order
  // status changes appear without a manual page refresh. Ticks pause while
  // the tab is hidden (see useLiveRefresh).
  useLiveRefresh(fetchDashboard, LIVE_REFRESH_INTERVAL_MS);

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/reorder`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Order placed successfully! I-monitor ang iyong order.");
        router.push(`/orders/${json.data.id}`);
      } else {
        throw new Error(json.error || "Failed to reorder");
      }
    } catch (err: any) {
      toast.error(err.message || "May error sa order. Please try again.");
    } finally {
      setReorderingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const label = status.replace(/_/g, " ");
    return (
      <Badge className={`rounded-lg flex items-center gap-1 px-2.5 py-1 text-[11px] ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}>
        <span>{STATUS_ICONS[status] || "📦"}</span>
        {label}
      </Badge>
    );
  };

  // Loading/error screens only while there is no data yet — a background
  // live-refresh must never flash a skeleton or replace the dashboard with
  // an error state (last good data stays on screen until new data arrives).
  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ErrorState title="May error na nangyari" message={error} onRetry={fetchDashboard} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <EmptyState icon={Package} title="No data available" message="We couldn't load your dashboard." />
      </div>
    );
  }

  const { activeOrders, recentOrders, upcomingScheduled, stats } = data;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 md:pt-8 pb-24 space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-xl font-bold">Magandang araw! 👋</h2>
        <p className="text-blue-100 text-sm mt-1">
          {stats.activeOrdersCount > 0 
            ? `You have ${stats.activeOrdersCount} active order${stats.activeOrdersCount > 1 ? 's' : ''}.` 
            : "Ready to order your next tubig?"}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/my/scheduled" className="bg-card rounded-2xl p-4 border border-border shadow-sm text-center hover:shadow-md transition-shadow" aria-label={`${stats.scheduledCount} scheduled deliveries`}>
          <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-1">
            <CalendarDays className="h-4 w-4" />
          </div>
          <p className="text-lg font-bold text-card-foreground">{stats.scheduledCount}</p>
          <p className="text-[10px] text-muted-foreground">Scheduled</p>
        </Link>
        <Link href="/profile/addresses" className="bg-card rounded-2xl p-4 border border-border shadow-sm text-center hover:shadow-md transition-shadow" aria-label={`${stats.addressesCount} saved addresses`}>
          <div className="h-9 w-9 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-1">
            <MapPin className="h-4 w-4" />
          </div>
          <p className="text-lg font-bold text-card-foreground">{stats.addressesCount}</p>
          <p className="text-[10px] text-muted-foreground">Addresses</p>
        </Link>
        <Link href="/my/payment-methods" className="bg-card rounded-2xl p-4 border border-border shadow-sm text-center hover:shadow-md transition-shadow" aria-label={`${stats.paymentMethodsCount} payment methods`}>
          <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-1">
            <CreditCard className="h-4 w-4" />
          </div>
          <p className="text-lg font-bold text-card-foreground">{stats.paymentMethodsCount}</p>
          <p className="text-[10px] text-muted-foreground">Payments</p>
        </Link>
      </div>

      {/* Active Orders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-card-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            Active Orders
          </h3>
          {activeOrders.length > 0 && (
            <Link href="/orders" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        {activeOrders.length > 0 ? (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                className="bg-card rounded-2xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/orders/${order.id}`)}
                role="button"
                tabIndex={0}
                aria-label={`Order #${order.id.slice(-6).toUpperCase()}`}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/orders/${order.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                      {order.station?.name?.[0] || "S"}
                    </div>
                    <span className="font-bold text-sm text-card-foreground">{order.station?.name || "Water Station"}</span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {format(new Date(order.createdAt), "MMM d, h:mm a")}
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">₱{order.total}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center">
            <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No active orders</p>
            <Button asChild size="sm" className="mt-3 rounded-full text-xs min-h-[44px]">
              <Link href="/stations">Order water now</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Quick Reorder */}
      {recentOrders.length > 0 && (
        <section>
          <h3 className="font-bold text-card-foreground flex items-center gap-2 mb-3">
            <RefreshCw className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
            Quick Reorder
          </h3>
          <div className="space-y-2">
            {recentOrders.slice(0, 3).map((order) => (
              <div key={order.id} className="bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                    <Droplets className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-card-foreground truncate">{order.station?.name || "Water Station"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.items?.map((i: any) => `${i.quantity}x ${i.product?.name || "Water"}`).join(", ")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs shrink-0 min-h-[44px]"
                  onClick={() => handleReorder(order.id)}
                  disabled={reorderingId === order.id}
                  aria-label={`Reorder from ${order.station?.name || "station"}`}
                >
                  {reorderingId === order.id ? "..." : "Reorder"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Scheduled Deliveries */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-card-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            Upcoming Scheduled Deliveries
          </h3>
          <Link href="/my/scheduled" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            Manage <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {upcomingScheduled.length > 0 ? (
          <div className="space-y-2">
            {upcomingScheduled.slice(0, 3).map((order) => (
              <div key={order.id} className="bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-card-foreground">{order.station?.name || "Water Station"}</p>
                    <p className="text-xs text-muted-foreground">
                      Every {order.recurringDay} • ₱{order.total}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" aria-hidden="true" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center">
            <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No scheduled deliveries yet</p>
            <Button asChild size="sm" className="mt-3 rounded-full text-xs min-h-[44px]">
              <Link href="/stations">Set up recurring delivery</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Recent History */}
      {recentOrders.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-card-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              Recent History
            </h3>
            <Link href="/orders" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {recentOrders.slice(0, 5).map((order, idx) => (
              <div
                key={order.id}
                className={`p-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${idx > 0 ? "border-t border-border" : ""}`}
                onClick={() => router.push(`/orders/${order.id}`)}
                role="button"
                tabIndex={0}
                aria-label={`Order #${order.id.slice(-6).toUpperCase()}`}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/orders/${order.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <Droplets className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-card-foreground truncate">{order.station?.name || "Water Station"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(order.createdAt), "MMM d")} • ₱{order.total}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(order.status)}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section>
        <h3 className="font-bold text-card-foreground flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-yellow-500" aria-hidden="true" />
          Quick Links
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/profile/addresses"
            className="bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow min-h-[56px]"
            aria-label="Manage addresses"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-sm text-card-foreground">Manage Addresses</p>
              <p className="text-[10px] text-muted-foreground">{stats.addressesCount} saved</p>
            </div>
          </Link>
          <Link
            href="/my/payment-methods"
            className="bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow min-h-[56px]"
            aria-label="Payment methods"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-sm text-card-foreground">Payment Methods</p>
              <p className="text-[10px] text-muted-foreground">{stats.paymentMethodsCount} saved</p>
            </div>
          </Link>
          <Link
            href="/orders"
            className="bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow min-h-[56px]"
            aria-label="My orders"
          >
            <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-sm text-card-foreground">My Orders</p>
              <p className="text-[10px] text-muted-foreground">View history</p>
            </div>
          </Link>
          <Link
            href="/my/scheduled"
            className="bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow min-h-[56px]"
            aria-label="Scheduled deliveries"
          >
            <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-sm text-card-foreground">Scheduled</p>
              <p className="text-[10px] text-muted-foreground">{stats.scheduledCount} active</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 md:pt-8 pb-24 space-y-6 animate-pulse" role="status" aria-label="Loading dashboard">
      {/* Greeting skeleton */}
      <div className="bg-blue-600/80 rounded-2xl p-6">
        <Skeleton className="h-7 w-48 bg-blue-400/50" />
        <Skeleton className="h-4 w-64 bg-blue-400/30 mt-2" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <Skeleton className="h-9 w-9 rounded-xl mx-auto" />
            <Skeleton className="h-6 w-8 mx-auto mt-2" />
            <Skeleton className="h-3 w-16 mx-auto mt-1" />
          </div>
        ))}
      </div>
      {/* Active Orders skeleton */}
      <div>
        <Skeleton className="h-5 w-32 mb-3" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border shadow-sm p-4 h-20" />
          ))}
        </div>
      </div>
      {/* Quick Links skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-border shadow-sm p-4 h-16" />
        ))}
      </div>
      <span className="sr-only">Loading your dashboard...</span>
    </div>
  );
}