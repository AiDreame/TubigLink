"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Package, 
  Truck,
  HelpCircle,
  ChevronRight,
  Droplets,
  Smartphone,
  Wallet,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Order, OrderStatus } from "@/types";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { MESSAGES } from "@/lib/constants";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchOrder = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        throw new Error(data.error || "Order not found");
      }
    } catch (err) {
      console.error("Failed to fetch order", err);
      setError("Hindi makuha ang detalye ng order.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrder(params.id as string);
  }, [params.id, fetchOrder]);

  const handleCancelOrder = async () => {
    if (!order) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel order");
      }
      // Update local state
      setOrder({ ...order, status: "CANCELLED" as const });
      setCancelDialogOpen(false);
    } catch (error: any) {
      console.error("Cancel order error:", error);
      setCancelError(error.message || "Hindi ma-cancel ang order. Pakisubukan muli.");
    } finally {
      setIsCancelling(false);
    }
  };

  const statusSteps: { status: OrderStatus; label: string; desc: string; icon: any }[] = [
    { status: "PENDING", label: "Order Placed", desc: "Waiting for station to accept", icon: Clock },
    { status: "ACCEPTED", label: "Accepted", desc: "Station has confirmed your order", icon: CheckCircle2 },
    { status: "PREPARING", label: "Preparing", desc: "Filling and cleaning containers", icon: Package },
    { status: "OUT_FOR_DELIVERY", label: "Out for Delivery", desc: "Rider is on the way to you", icon: Truck },
    { status: "DELIVERED", label: "Delivered", desc: "Enjoy your fresh water!", icon: CheckCircle2 },
  ];

  const currentStepIndex = order ? statusSteps.findIndex(s => s.status === order.status) : -1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4" role="status" aria-label="Loading order details">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <span className="sr-only">Loading order details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={MESSAGES.errorTitle}
        message={error}
        onRetry={() => fetchOrder(params.id as string)}
        fullPage
      />
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <h2 className="text-xl font-bold text-foreground">{MESSAGES.orderNotFound}</h2>
        <Button onClick={() => router.back()} className="mt-4 rounded-xl min-h-[44px]">
          {MESSAGES.goBack}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card sticky top-0 z-30 border-b border-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-card-foreground">{MESSAGES.orderDetails}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">#{order.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="rounded-full text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30 min-h-[44px]">
          {MESSAGES.support}
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Status Tracker */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border overflow-hidden" role="region" aria-label="Order status tracker">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-bold text-card-foreground">{MESSAGES.trackOrder}</h2>
            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-none">
              {order.status.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="space-y-6">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={step.status} className="flex gap-4 relative">
                  {index < statusSteps.length - 1 && (
                    <div 
                      className={`absolute left-5 top-8 bottom-[-1.5rem] w-0.5 ${
                        index < currentStepIndex ? "bg-blue-600 dark:bg-blue-400" : "bg-muted"
                      }`} 
                      aria-hidden="true"
                    />
                  )}
                  
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    isCompleted ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50" : "bg-muted text-muted-foreground"
                  }`} aria-label={step.label}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  
                  <div className="pt-1">
                    <p className={`font-bold text-sm ${isCompleted ? "text-card-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    )}
                    {isCompleted && !isCurrent && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Station Contact */}
        <div className="bg-card rounded-3xl p-4 shadow-sm border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
              {order.station?.name?.[0]}
            </div>
            <div>
              <h3 className="font-bold text-card-foreground">{order.station?.name}</h3>
              <p className="text-xs text-muted-foreground">Contact station for updates</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" className="rounded-full min-h-[44px] min-w-[44px]" aria-label="Message station">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </Button>
            <Button size="icon" variant="outline" className="rounded-full min-h-[44px] min-w-[44px]" aria-label="Call station">
              <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
            </Button>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/50">
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">{MESSAGES.orderItems}</h2>
          </div>
          <div className="divide-y divide-border">
            {order.items.map((item) => (
              <div key={item.id} className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Droplets className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-card-foreground">{item.product?.name || "Water Container"}</p>
                    <p className="text-xs text-muted-foreground">{item.product?.size || "5 Gallons"} x {item.quantity}</p>
                  </div>
                </div>
                <p className="font-bold text-sm text-card-foreground">₱{item.unitPrice * item.quantity}</p>
              </div>
            ))}
          </div>
          <div className="p-6 bg-blue-50/30 dark:bg-blue-900/10 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{MESSAGES.subtotal}</span>
              <span className="font-medium text-card-foreground">₱{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{MESSAGES.deliveryFee}</span>
              <span className="font-medium text-card-foreground">₱{order.deliveryFee}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-card-foreground">{MESSAGES.total}</span>
              <span className="font-bold text-xl text-blue-600 dark:text-blue-400">₱{order.total}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 pt-4">
              {order.paymentMethod === "GCASH" ? (
                <Smartphone className="h-3.5 w-3.5 text-blue-500" />
              ) : (
                <Wallet className="h-3.5 w-3.5 text-green-500" />
              )}
              <p className="text-[10px] text-muted-foreground">
                {order.paymentMethod === "GCASH" ? "GCash" : "Cash on Delivery"} • {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border space-y-4">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">{MESSAGES.deliveryAddress}</h2>
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 text-red-500 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold text-sm text-card-foreground">{order.address?.label || "Home"}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {order.address?.street}, {order.address?.barangay}, {order.address?.city}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{order.address?.landmark && `Note: ${order.address.landmark}`}</p>
            </div>
          </div>
        </div>

        {/* Delivery Notes */}
        {order.notes && (
          <div className="bg-card rounded-3xl p-6 shadow-sm border border-border space-y-4">
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Notes for Driver</h2>
            <div className="flex gap-3">
              <MessageSquare className="h-5 w-5 text-blue-500 shrink-0" aria-hidden="true" />
              <p className="text-sm text-card-foreground">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Cancel Order Button — only for PENDING orders */}
        {order.status === "PENDING" && (
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-14 rounded-2xl border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 flex items-center justify-center gap-2 min-h-[44px]"
              onClick={() => { setCancelDialogOpen(true); setCancelError(null); }}
            >
              <XCircle className="h-5 w-5" aria-hidden="true" />
              Cancel Order
            </Button>

            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
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
                    onClick={() => { setCancelDialogOpen(false); setCancelError(null); }}
                    className="rounded-xl min-h-[44px]"
                    disabled={isCancelling}
                  >
                    Keep Order
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelOrder}
                    className="rounded-xl min-h-[44px]"
                    disabled={isCancelling}
                  >
                    {isCancelling ? "Cancelling..." : "Yes, Cancel Order"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-border text-muted-foreground flex items-center justify-between px-6 min-h-[44px]"
          onClick={() => router.push("/orders")}
          aria-label={MESSAGES.backToOrders}
        >
          <span>{MESSAGES.backToOrders}</span>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </main>
    </div>
  );
}