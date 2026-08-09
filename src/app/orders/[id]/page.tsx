"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  XCircle,
  Star,
  ShieldCheck,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import DisputeEvidence, { isImageEvidence } from "@/components/shared/DisputeEvidence";
import { MESSAGES } from "@/lib/constants";

function paymentStatusLabel(status: string): string {
  switch (status) {
    case "PAID": return "Paid";
    case "FAILED": return "Payment failed";
    case "REQUIRES_ACTION": return "Awaiting payment";
    default: return "Payment pending";
  }
}

function paymentStatusClasses(status: string): string {
  const pending = "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 border-none";
  switch (status) {
    case "PAID": return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 border-none";
    case "FAILED": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 border-none";
    case "REQUIRES_ACTION": return pending;
    default: return pending;
  }
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Delivery confirmation state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [autoConfirmLabel, setAutoConfirmLabel] = useState<string | null>(null);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);

  // Customer dispute state
  const [dispute, setDispute] = useState<any | null>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeType, setDisputeType] = useState("QUALITY");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // Dispute photo upload state ("idle" | "uploading" | "done" | "error")
  const [disputePhotoUploading, setDisputePhotoUploading] = useState(false);
  const [disputePhotoStatus, setDisputePhotoStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [disputePhotoError, setDisputePhotoError] = useState<string | null>(null);

  const fetchDispute = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/disputes`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setDispute(data.data?.[0] || null);
    } catch (err) {
      console.error("Failed to fetch dispute", err);
    }
  }, []);

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const fetchOrder = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
        setDeliveryPhoto(data.data.deliveryPhoto || null);
        setConfirmSuccess(!!data.data.deliveryConfirmedAt);
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
    const id = params.id as string;
    fetchOrder(id);
    fetchDispute(id);
  }, [params.id, fetchOrder, fetchDispute]);

  const handleSubmitDispute = async () => {
    if (!order) return;
    setDisputeSubmitting(true);
    setDisputeError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: disputeType, description: disputeDescription, evidence: disputeEvidence || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Unable to report issue");
      setDisputeDialogOpen(false);
      setDisputeDescription("");
      setDisputeEvidence("");
      setDisputePhotoStatus("idle");
      setDisputePhotoError(null);
      await fetchDispute(order.id);
    } catch (err: any) {
      setDisputeError(err.message || "Unable to report issue");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const handleDisputePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setDisputePhotoUploading(true);
    setDisputePhotoStatus("uploading");
    setDisputePhotoError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success || !data.url) throw new Error(data.error || "Upload failed");
      setDisputeEvidence(data.url);
      setDisputePhotoStatus("done");
    } catch (err: any) {
      setDisputePhotoStatus("error");
      setDisputePhotoError(err.message || "Upload failed. Please try again.");
    } finally {
      setDisputePhotoUploading(false);
    }
  };

  const clearDisputePhoto = () => {
    setDisputeEvidence("");
    setDisputePhotoStatus("idle");
    setDisputePhotoError(null);
  };

  // Auto-confirm countdown: shows "Auto-confirms in ~Xh Ym" while the order is
  // DELIVERED but not yet confirmed. Display only — eligibility is decided
  // server-side from deliveredAt (lazy backfill on reads). When the countdown
  // hits zero we refetch so the server backfills the confirmation timestamps.
  useEffect(() => {
    if (!order || order.status !== "DELIVERED" || order.deliveryConfirmedAt) {
      setAutoConfirmLabel(null);
      return;
    }
    if (!order.deliveredAt) {
      setAutoConfirmLabel(null);
      return;
    }
    const tick = () => {
      const deliveredAt = new Date(order.deliveredAt!).getTime();
      const autoAt = deliveredAt + 24 * 60 * 60 * 1000;
      const remaining = autoAt - Date.now();
      if (remaining <= 0) {
        setAutoConfirmLabel("Auto-confirming…");
        fetchOrder(order.id);
        return;
      }
      const totalMinutes = Math.floor(remaining / 60000);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      setAutoConfirmLabel(`Auto-confirms in ~${h}h ${m}m`);
    };
    tick();
    const interval = setInterval(tick, 60 * 1000);
    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  const handleConfirmDelivery = async () => {
    if (!order) return;
    setIsConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm-delivery`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm delivery");
      }
      setOrder(data.data);
      setDeliveryPhoto(data.data.deliveryPhoto || null);
      setConfirmDialogOpen(false);
      setConfirmSuccess(true);
      setAutoConfirmLabel(null);
    } catch (error: any) {
      console.error("Confirm delivery error:", error);
      setConfirmError(error.message || "Hindi ma-confirm ang delivery. Pakisubukan muli.");
    } finally {
      setIsConfirming(false);
    }
  };

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

  const handleSubmitReview = async () => {
    if (!order || !session?.user?.id) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (session.user as any).id,
          stationId: order.stationId,
          orderId: order.id,
          rating: reviewRating,
          comment: reviewComment || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }
      setReviewSuccess(true);
      // Update the order with the new review
      setOrder({ ...order, review: data.data });
    } catch (err: any) {
      console.error("Review submission error:", err);
      setReviewError(err.message || "Hindi ma-submit ang review. Pakisubukan muli.");
    } finally {
      setReviewSubmitting(false);
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
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border overflow-hidden" role="region" aria-label="Order status tracker">
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

        {/* Delivery Confirmation — only for DELIVERED orders */}
        {order.status === "DELIVERED" && (
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4" role="region" aria-label="Delivery confirmation">
            {order.deliveryConfirmedAt ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-card-foreground">Delivery confirmed</p>
                    {dispute ? (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>Issue report: <span className="font-semibold text-card-foreground">{dispute.status.replace(/_/g, " ")}</span></p>
                        <p>Station must respond by {format(new Date(dispute.responseDeadlineAt), "MMM d, yyyy h:mm a")}</p>
                        {dispute.stationResponse && <p>Station response: {dispute.stationResponse}</p>}
                        {dispute.resolution && <p>Resolution: {dispute.resolution}</p>}
                        {dispute.evidence && <DisputeEvidence evidence={dispute.evidence} alt="Issue evidence photo" />}
                      </div>
                    ) : order.paymentStatus === "PAID" && order.disputeDeadlineAt && new Date(order.disputeDeadlineAt).getTime() > Date.now() ? (
                      <>
                        <p className="text-xs text-muted-foreground">You can report an issue until {format(new Date(order.disputeDeadlineAt), "MMM d, yyyy h:mm a")}</p>
                        <Button variant="outline" className="mt-2 rounded-xl min-h-[44px]" onClick={() => { setDisputeError(null); setDisputeDialogOpen(true); }}>
                          <HelpCircle className="h-4 w-4 mr-2" aria-hidden="true" /> Report an issue
                        </Button>
                      </>
                    ) : order.disputeDeadlineAt ? (
                      <p className="text-xs text-muted-foreground">The issue-reporting window has closed.</p>
                    ) : null}
                  </div>
                </div>
                {order.deliveryPhoto && (
                  <a href={order.deliveryPhoto} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={order.deliveryPhoto} alt="Delivery evidence photo" className="rounded-xl border border-border max-h-48 w-auto object-cover" />
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-card-foreground">How was your delivery?</p>
                    <p className="text-xs text-muted-foreground">
                      Confirm you received your order to close out this delivery.
                    </p>
                    {autoConfirmLabel && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {autoConfirmLabel}
                      </p>
                    )}
                  </div>
                </div>
                {order.deliveryPhoto && (
                  <a href={order.deliveryPhoto} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={order.deliveryPhoto} alt="Delivery evidence photo" className="rounded-xl border border-border max-h-48 w-auto object-cover" />
                  </a>
                )}
                <Button
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold min-h-[44px]"
                  onClick={() => { setConfirmDialogOpen(true); setConfirmError(null); }}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" aria-hidden="true" />
                  Confirm Delivery
                </Button>

                <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                  <DialogContent className="rounded-2xl max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-card-foreground">Confirm Delivery?</DialogTitle>
                      <DialogDescription>
                        Have you received your full order? Confirming closes the delivery and starts the 36-hour issue window.
                      </DialogDescription>
                    </DialogHeader>
                    {confirmError && (
                      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl p-3">
                        {confirmError}
                      </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        variant="outline"
                        onClick={() => { setConfirmDialogOpen(false); setConfirmError(null); }}
                        className="rounded-xl min-h-[44px]"
                        disabled={isConfirming}
                      >
                        Not Yet
                      </Button>
                      <Button
                        onClick={handleConfirmDelivery}
                        className="rounded-xl min-h-[44px]"
                        disabled={isConfirming}
                      >
                        {isConfirming ? "Confirming..." : "Yes, Confirm"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}

        <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
          <DialogContent className="rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Report an issue</DialogTitle>
              <DialogDescription>Tell us what went wrong. The station will have 24 hours to respond.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <label className="text-sm font-medium text-card-foreground">Issue type
                <select value={disputeType} onChange={(e) => setDisputeType(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm">
                  <option value="NOT_DELIVERED">Not delivered</option><option value="QUALITY">Quality concern</option><option value="OTHER">Other</option>
                </select>
              </label>
              <label className="text-sm font-medium text-card-foreground">Description
                <Textarea value={disputeDescription} onChange={(e) => setDisputeDescription(e.target.value)} placeholder="Describe the issue" className="mt-1 rounded-xl min-h-[90px] resize-none" />
              </label>
              <div>
                <span className="text-sm font-medium text-card-foreground flex items-center gap-1.5"><Camera className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Evidence photo (optional)</span>
                <div className="mt-1 rounded-xl border border-border bg-background p-3 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleDisputePhoto}
                    disabled={disputePhotoUploading}
                    className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 dark:file:bg-blue-900/30 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-600 dark:file:text-blue-400"
                  />
                  <p className="text-[11px] text-muted-foreground">Take a picture with your camera or choose an image (max 5 MB).</p>
                  {isImageEvidence(disputeEvidence) && disputePhotoStatus === "done" && (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={disputeEvidence} alt="Evidence preview" className="rounded-lg border border-border max-h-36 w-auto object-cover" />
                      <button
                        type="button"
                        onClick={clearDisputePhoto}
                        className="absolute top-2 right-2 rounded-full bg-black/60 text-white text-xs px-2 py-1 hover:bg-black/80"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {disputePhotoStatus === "uploading" && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" aria-hidden="true" />
                      Uploading…
                    </p>
                  )}
                  {disputePhotoStatus === "done" && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Uploaded
                    </p>
                  )}
                  {disputePhotoStatus === "error" && (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-red-600 dark:text-red-400 break-all">{disputePhotoError}</p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleDisputePhoto}
                        disabled={disputePhotoUploading}
                        className="text-xs text-blue-600 dark:text-blue-400"
                      />
                    </div>
                  )}
                </div>
              </div>
              <label className="block text-sm font-medium text-card-foreground">…or paste an image link (optional)
                <input value={disputeEvidence} onChange={(e) => { setDisputeEvidence(e.target.value); if (!e.target.value) setDisputePhotoStatus("idle"); }} placeholder="https://…" className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm" />
              </label>
              {disputeError && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl p-3">{disputeError}</div>}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDisputeDialogOpen(false)} className="rounded-xl min-h-[44px]" disabled={disputeSubmitting}>Cancel</Button>
              <Button onClick={handleSubmitDispute} className="rounded-xl min-h-[44px]" disabled={disputeSubmitting || disputePhotoUploading || !disputeDescription.trim()}>{disputeSubmitting ? "Submitting..." : "Submit report"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GCash Payment Status */}
        {order.paymentMethod === "GCASH" && (
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center justify-between" role="region" aria-label="Payment status">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-card-foreground">GCash Payment</p>
                <p className="text-xs text-muted-foreground font-mono">Ref #{order.id.slice(-8).toUpperCase()}</p>
              </div>
            </div>
            <Badge className={paymentStatusClasses(order.paymentStatus)}>
              {paymentStatusLabel(order.paymentStatus)}
            </Badge>
            {(order as any).refunds?.[0] && (
              <p className="mt-2 text-sm text-muted-foreground">
                {(order as any).refunds[0].status === "PENDING" ? "Refund in progress — GCash refunds can take a few days" :
                 (order as any).refunds[0].status === "SUCCEEDED" ? "Refunded" : "Refund failed — we will contact you"}
              </p>
            )}
          </div>
        )}

        {/* Station Contact */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center justify-between">
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
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
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
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
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
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
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

        {/* Review Section — only for DELIVERED orders */}
        {order.status === "DELIVERED" && (
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
            {order.review || reviewSuccess ? (
              // Existing review display
              <div className="space-y-3">
                <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Your Review</h2>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < (order.review?.rating || reviewRating) ? "text-yellow-500 fill-current" : "text-muted-foreground/30"}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <span className="font-bold text-card-foreground">{order.review?.rating || reviewRating}/5</span>
                </div>
                {(order.review?.comment || reviewComment) && (
                  <p className="text-sm text-muted-foreground">{order.review?.comment || reviewComment}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {reviewSuccess ? "Review submitted successfully!" : `Reviewed on ${order.review?.createdAt ? format(new Date(order.review.createdAt), "MMM d, yyyy") : ""}`}
                </p>
              </div>
            ) : (
              // Review submission form
              <div className="space-y-4">
                <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Rate your experience</h2>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => { setReviewRating(star); setReviewError(null); }}
                      className="p-1 rounded-md hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-lg"
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`h-8 w-8 ${star <= reviewRating ? "text-yellow-500 fill-current" : "text-muted-foreground/30"} transition-colors`}
                      />
                    </button>
                  ))}
                  {reviewRating > 0 && (
                    <span className="ml-2 text-sm font-bold text-card-foreground">{reviewRating}/5</span>
                  )}
                </div>

                <div>
                  <Textarea
                    placeholder="Share your experience (optional)..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="rounded-xl border-border min-h-[80px] resize-none"
                    rows={3}
                  />
                </div>

                {reviewError && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl p-3">
                    {reviewError}
                  </div>
                )}

                <Button
                  onClick={handleSubmitReview}
                  disabled={reviewRating === 0 || reviewSubmitting}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold min-h-[44px]"
                >
                  {reviewSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            )}
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