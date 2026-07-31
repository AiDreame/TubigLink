"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Droplets, Clock, Trash2, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { MESSAGES } from "@/lib/constants";
import { format } from "date-fns";
import toast from "react-hot-toast";

const DAY_LABELS: Record<string, string> = {
  MON: "Every Monday",
  TUE: "Every Tuesday",
  WED: "Every Wednesday",
  THU: "Every Thursday",
  FRI: "Every Friday",
  SAT: "Every Saturday",
  SUN: "Every Sunday",
};

export default function ScheduledPage() {
  const router = useRouter();
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchScheduled = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/scheduled");
      if (!res.ok) throw new Error("Failed to fetch scheduled orders");
      const json = await res.json();
      if (json.success) {
        setScheduled(json.data || []);
      } else {
        throw new Error(json.error || "Hindi makuha ang data");
      }
    } catch (err: any) {
      setError("Hindi makuha ang scheduled deliveries. Pakisubukan muli.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled();
  }, []);

  const handleCancel = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled delivery?")) return;
    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/orders/scheduled?id=${orderId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Scheduled delivery cancelled.");
        fetchScheduled();
      } else {
        throw new Error(json.error || "Failed to cancel");
      }
    } catch (err: any) {
      toast.error(err.message || "May error sa pag-cancel. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
      case "ACCEPTED":
      case "PREPARING": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "OUT_FOR_DELIVERY": return "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300";
      case "DELIVERED": return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      case "CANCELLED": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card sticky top-0 z-30 border-b border-border px-4 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.push("/")} aria-label="Go back to home">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-card-foreground">Scheduled Deliveries</h1>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4" role="status" aria-label="Loading scheduled deliveries">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
            <span className="sr-only">Loading scheduled deliveries...</span>
          </div>
        ) : error ? (
          <ErrorState
            title="Hindi ma-load ang scheduled deliveries"
            message={error}
            onRetry={fetchScheduled}
          />
        ) : scheduled.length > 0 ? (
          scheduled.map((order) => (
            <div key={order.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <CalendarDays className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-bold text-card-foreground">{order.station?.name || "Water Station"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {DAY_LABELS[order.recurringDay] || order.recurringDay}
                      </p>
                    </div>
                  </div>
                  <Badge className={`rounded-lg ${getStatusColor(order.status)}`}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                {/* Items */}
                <div className="bg-muted rounded-xl p-3 mb-3">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-1">
                      <span className="flex items-center gap-2">
                        <Droplets className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                        {item.product?.name || "Water"} x{item.quantity}
                      </span>
                      <span className="font-medium text-card-foreground">₱{item.unitPrice * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Address & Total */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground mb-3">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{order.address?.street || "Address"}, {order.address?.barangay || ""}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Since {format(new Date(order.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-600 dark:text-blue-400">₱{order.total}/delivery</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs text-red-500 dark:text-red-400 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px]"
                      onClick={() => handleCancel(order.id)}
                      disabled={cancellingId === order.id || order.status === "CANCELLED"}
                      aria-label="Cancel scheduled delivery"
                    >
                      {cancellingId === order.id ? (
                        "Cancelling..."
                      ) : order.status === "CANCELLED" ? (
                        "Cancelled"
                      ) : (
                        <>
                          <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
                          Cancel
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <div className="h-16 w-16 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="h-8 w-8 text-purple-200 dark:text-purple-400" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-card-foreground mb-1">No scheduled deliveries</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Set up recurring water deliveries so you never run out.
            </p>
            <Button asChild className="rounded-2xl px-8 min-h-[44px]">
              <Link href="/stations">Browse Stations</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}