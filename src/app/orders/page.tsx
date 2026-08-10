"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  ShoppingBag, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  Package, 
  Truck,
  Search,
  XCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Order } from "@/types";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { MESSAGES } from "@/lib/constants";
import { NotificationBell } from "@/components/shared/NotificationBell";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
      setError("Hindi makuha ang iyong mga order. Pakisubukan muli.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel order");
      }
      // Update the order in local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "CANCELLED" as const } : o
        )
      );
      setCancelDialogId(null);
    } catch (error: any) {
      console.error("Cancel order error:", error);
      setCancelError(error.message || "Hindi ma-cancel ang order. Pakisubukan muli.");
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED": return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      case "CANCELLED": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      case "OUT_FOR_DELIVERY": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "ACCEPTED":
      case "PREPARING": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED": return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
      case "OUT_FOR_DELIVERY": return <Truck className="h-4 w-4" aria-hidden="true" />;
      case "PENDING": return <Clock className="h-4 w-4" aria-hidden="true" />;
      default: return <Package className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const ongoingOrders = orders.filter(o => !["DELIVERED", "CANCELLED"].includes(o.status));
  const historyOrders = orders.filter(o => ["DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card sticky top-0 z-30 border-b border-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.push("/")} aria-label="Go back to home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-card-foreground">{MESSAGES.myOrders}</h1>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell className="hidden sm:block" />
          <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" aria-label="Search orders">
            <Search className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        <Tabs defaultValue="ongoing" className="w-full mb-6">
          <TabsList className="w-full bg-card rounded-2xl p-1 h-12 shadow-sm border border-border" role="tablist">
            <TabsTrigger 
              value="ongoing" 
              className="flex-1 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              role="tab"
            >
              {MESSAGES.ongoing}
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="flex-1 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              role="tab"
            >
              {MESSAGES.history}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ongoing" className="mt-4 space-y-4" role="tabpanel">
            {isLoading ? (
              <div className="space-y-4" role="status" aria-label="Loading orders">
                {[1, 2].map(i => (
                  <div key={i} className="h-32 bg-card rounded-2xl animate-pulse border border-border" />
                ))}
                <span className="sr-only">Loading orders...</span>
              </div>
            ) : error ? (
              <ErrorState
                title="Hindi ma-load ang mga order"
                message={error}
                onRetry={fetchOrders}
              />
            ) : ongoingOrders.length > 0 ? (
              ongoingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-blue-200 dark:text-blue-400" aria-hidden="true" />
                </div>
                <p className="text-muted-foreground">{MESSAGES.noActiveOrders}</p>
                <Button variant="link" className="text-blue-600 dark:text-blue-400 min-h-[44px]" onClick={() => router.push("/stations")}>
                  {MESSAGES.orderWaterNow}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-4" role="tabpanel">
            {isLoading ? (
              <div className="space-y-4" role="status">
                {[1, 2].map(i => (
                  <div key={i} className="h-32 bg-card rounded-2xl animate-pulse border border-border" />
                ))}
              </div>
            ) : error ? (
              <ErrorState
                title="Hindi ma-load ang mga order"
                message={error}
                onRetry={fetchOrders}
              />
            ) : historyOrders.length > 0 ? (
              historyOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                <p className="text-muted-foreground">{MESSAGES.noPastOrders}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );

  function OrderCard({ order }: { order: Order }) {
    const statusLabel = order.status.replace(/_/g, " ");
    const isPending = order.status === "PENDING";
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <div 
          className="p-4 cursor-pointer"
          onClick={() => router.push(`/orders/${order.id}`)}
          role="button"
          tabIndex={0}
          aria-label={`Order ${order.id.slice(-6).toUpperCase()} - ${statusLabel}`}
          onKeyDown={(e) => e.key === "Enter" && router.push(`/orders/${order.id}`)}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                {order.station?.name?.[0] || "S"}
              </div>
              <div>
                <h3 className="font-bold text-card-foreground">{order.station?.name || "Water Station"}</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Order #{order.id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>
            <Badge className={`rounded-lg flex items-center gap-1.5 px-2.5 py-1 ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
              {statusLabel}
            </Badge>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{format(new Date(order.createdAt), "MMM d, h:mm a")}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase">Items</p>
                <p className="text-sm font-bold text-card-foreground">{order.items?.length || 0} units</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{order.total}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Cancel button for PENDING orders */}
        {isPending && (
          <div className="px-4 pb-4">
            <Dialog open={cancelDialogId === order.id} onOpenChange={(open) => { setCancelDialogId(open ? order.id : null); setCancelError(null); }}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 min-h-[44px]"
                  onClick={(e) => { e.stopPropagation(); setCancelDialogId(order.id); }}
                >
                  <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Cancel Order
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-card-foreground">Cancel Order?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to cancel this order? This action cannot be undone once the station accepts it.
                  </DialogDescription>
                </DialogHeader>
                {cancelError && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl p-3">
                    {cancelError}
                  </div>
                )}
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => { setCancelDialogId(null); setCancelError(null); }}
                    className="rounded-xl min-h-[44px]"
                    disabled={cancellingId === order.id}
                  >
                    Keep Order
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelOrder(order.id)}
                    className="rounded-xl min-h-[44px]"
                    disabled={cancellingId === order.id}
                  >
                    {cancellingId === order.id ? "Cancelling..." : "Yes, Cancel Order"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    );
  }
}