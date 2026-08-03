"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * GCash payment return page (M5).
 *
 * The browser being redirected here is NOT proof of payment — the server
 * (GET /api/payments/orders/:orderId, backed by the PayMongo PaymentIntent
 * + M4 webhook state machine) is authoritative. This page polls it briefly
 * and renders the honest state.
 */

type ReturnState =
  | { phase: "verifying" }
  | { phase: "paid"; orderId: string }
  | { phase: "pending"; orderId: string }
  | { phase: "failed"; orderId: string }
  | { phase: "unavailable"; message: string };

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TRIES = 10;

function GcashReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const [state, setState] = useState<ReturnState>({ phase: "verifying" });

  useEffect(() => {
    if (!orderId) {
      setState({ phase: "unavailable", message: "Missing order reference in the return URL." });
      return;
    }

    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      if (cancelled) return;
      tries += 1;
      try {
        const res = await fetch(`/api/payments/orders/${encodeURIComponent(orderId)}`);
        const json = await res.json();
        if (res.ok && json.success) {
          const status = String(json.data.paymentStatus || "").toUpperCase();
          if (status === "PAID") {
            setState({ phase: "paid", orderId });
            return;
          }
          if (status === "FAILED" || status === "REFUNDED") {
            setState({ phase: "failed", orderId });
            return;
          }
          // REQUIRES_ACTION / PENDING / PROCESSING — keep polling.
        }
      } catch {
        // Transient network error — keep polling until we run out of tries.
      }

      if (tries >= MAX_POLL_TRIES) {
        setState({ phase: "pending", orderId });
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (state.phase === "verifying") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-6" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-foreground">Verifying your payment…</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Please wait while we confirm your GCash payment with the station. Do not close this page.
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mt-4 font-mono">
            Order #{orderId.slice(-8).toUpperCase()}
          </p>
        )}
      </div>
    );
  }

  if (state.phase === "paid") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Payment confirmed 🎉</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Your GCash payment has been verified and the station has been notified. Your order is now being processed.
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            Payment reference: #{orderId.slice(-8).toUpperCase()}
          </p>
        )}
        <div className="flex gap-3 mt-8">
          <Button className="rounded-xl h-12 px-8" onClick={() => router.replace(`/orders/${orderId}`)}>
            View Order
          </Button>
          <Button variant="outline" className="rounded-xl h-12 px-8" onClick={() => router.replace("/orders")}>
            My Orders
          </Button>
        </div>
      </div>
    );
  }

  if (state.phase === "pending") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
          <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Payment is still being confirmed</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Do not pay again. We will update your order automatically once the payment is confirmed by GCash.
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            Payment reference: #{orderId.slice(-8).toUpperCase()}
          </p>
        )}
        <div className="flex gap-3 mt-8">
          <Button className="rounded-xl h-12 px-8" onClick={() => router.replace(`/orders/${orderId}`)}>
            View Order
          </Button>
          <Button variant="outline" className="rounded-xl h-12 px-8" onClick={() => router.replace("/orders")}>
            My Orders
          </Button>
        </div>
      </div>
    );
  }

  if (state.phase === "failed") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
          <XCircle className="h-10 w-10 text-red-500" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Payment failed</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Your GCash payment could not be completed. You can try again — no amount has been charged unless the order shows as paid.
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            Order #{orderId.slice(-8).toUpperCase()}
          </p>
        )}
        <div className="flex gap-3 mt-8">
          <Button className="rounded-xl h-12 px-8" onClick={() => router.replace("/cart")}>
            Try Again
          </Button>
          <Button variant="outline" className="rounded-xl h-12 px-8" onClick={() => router.replace(`/orders/${orderId}`)}>
            View Order
          </Button>
        </div>
      </div>
    );
  }

  // unavailable
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
        <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">We could not verify your payment</h1>
      <p className="text-muted-foreground mt-2 max-w-sm">{state.message}</p>
      <div className="flex gap-3 mt-8">
        <Button variant="outline" className="rounded-xl h-12 px-8" onClick={() => router.replace("/orders")}>
          My Orders
        </Button>
        <Button variant="outline" className="rounded-xl h-12 px-8" asChild>
          <Link href="/cart">Back to Cart</Link>
        </Button>
      </div>
    </div>
  );
}

export default function GcashReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-6" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-foreground">Verifying your payment…</h1>
        </div>
      }
    >
      <GcashReturnContent />
    </Suspense>
  );
}
