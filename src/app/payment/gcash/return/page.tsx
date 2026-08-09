"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, LogIn, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * GCash payment return page (M5).
 *
 * The browser being redirected here is NOT proof of payment — the server
 * (GET /api/payments/orders/:orderId, backed by the PayMongo PaymentIntent
 * + M4 webhook state machine) is authoritative. This page polls it briefly
 * and renders the honest state.
 *
 * Failure handling (client-side only):
 * - 401 → stop polling, prompt login (the poll can never succeed without a session).
 * - 403 → stop polling, show access-denied (logged-in user is not the order owner).
 * - 404 → stop early, show the unavailable state.
 * - 5xx / network errors → after MAX_CONSECUTIVE_ERRORS failed tries, offer a
 *   manual "Check again" instead of burning all MAX_POLL_TRIES on a dead end.
 */

type ReturnState =
  | { phase: "verifying" }
  | { phase: "paid"; orderId: string }
  | { phase: "pending"; orderId: string }
  | { phase: "failed"; orderId: string }
  | { phase: "unavailable"; message: string }
  | { phase: "auth-required"; orderId: string }
  | { phase: "access-denied"; orderId: string }
  | { phase: "verify-error"; orderId: string };

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TRIES = 10;
const MAX_CONSECUTIVE_ERRORS = 3;

function GcashReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const [state, setState] = useState<ReturnState>({ phase: "verifying" });
  // Incremented by "Check again" to re-run the poll effect from scratch.
  const [pollAttempt, setPollAttempt] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setState({ phase: "unavailable", message: "Missing order reference in the return URL." });
      return;
    }

    let cancelled = false;
    let tries = 0;
    let consecutiveErrors = 0;

    const poll = async () => {
      if (cancelled) return;
      tries += 1;
      let errored = false;
      try {
        const res = await fetch(`/api/payments/orders/${encodeURIComponent(orderId)}`);
        if (res.status === 401) {
          // No session — polling can never succeed. Stop and offer login so the
          // customer lands back here (with order_id & payment_intent_id intact)
          // and the next poll confirms instantly.
          setState({ phase: "auth-required", orderId });
          return;
        }
        if (res.status === 403) {
          // Logged in, but this account is not the order owner.
          setState({ phase: "access-denied", orderId });
          return;
        }
        if (res.status === 404) {
          setState({
            phase: "unavailable",
            message: "We could not find this order. It may have been removed or the link may be incomplete.",
          });
          return;
        }
        if (!res.ok) {
          // 5xx or unexpected server error.
          errored = true;
        } else {
          const json = await res.json();
          if (json.success) {
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
          } else {
            errored = true;
          }
        }
      } catch {
        // Transient network error or unparseable body.
        errored = true;
      }

      if (errored) {
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          // Don't burn all tries on a deterministic 500 / dead network — hand
          // the customer a manual retry instead.
          setState({ phase: "verify-error", orderId });
          return;
        }
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
  }, [orderId, pollAttempt]);

  const checkAgain = () => {
    setState({ phase: "verifying" });
    setPollAttempt((attempt) => attempt + 1);
  };

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

  if (state.phase === "auth-required") {
    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : `/payment/gcash/return`;
    const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
          <LogIn className="h-10 w-10 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Please log in to confirm your payment</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Your payment may have already gone through. Log in to verify your order — we will bring you back
          here and confirm it right away.
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            Payment reference: #{orderId.slice(-8).toUpperCase()}
          </p>
        )}
        <div className="flex gap-3 mt-8">
          <Button className="rounded-xl h-12 px-8" asChild>
            <Link href={loginHref}>Log In</Link>
          </Button>
          <Button variant="outline" className="rounded-xl h-12 px-8" onClick={() => router.replace("/orders")}>
            My Orders
          </Button>
        </div>
      </div>
    );
  }

  if (state.phase === "access-denied") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">You do not have access to this order</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          This order belongs to another account. Please log in with the account that placed it to see its
          payment status.
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            Order #{orderId.slice(-8).toUpperCase()}
          </p>
        )}
        <div className="flex gap-3 mt-8">
          <Button className="rounded-xl h-12 px-8" onClick={() => router.replace("/orders")}>
            My Orders
          </Button>
          <Button variant="outline" className="rounded-xl h-12 px-8" onClick={() => router.replace("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (state.phase === "verify-error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">We couldn&apos;t verify your payment automatically</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Do not pay again. Check again in a moment — if your payment went through, your order will show as
          paid.
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            Payment reference: #{orderId.slice(-8).toUpperCase()}
          </p>
        )}
        <div className="flex gap-3 mt-8">
          <Button className="rounded-xl h-12 px-8" onClick={checkAgain}>
            Check again
          </Button>
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
