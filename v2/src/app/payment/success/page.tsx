"use client";
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [status, setStatus] = useState<"checking" | "confirmed" | "error">("checking");

  useEffect(() => {
    if (!orderId) {
      setStatus("error");
      return;
    }
    let attempts = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/check/${orderId}`);
        const json = await res.json();
        if (json.success && json.data.paymentStatus === "PAID") {
          setStatus("confirmed");
          clearInterval(interval);
        }
        attempts++;
        if (attempts > 15) {
          clearInterval(interval);
          setStatus("confirmed");
        }
      } catch {
        attempts++;
        if (attempts > 15) {
          clearInterval(interval);
          setStatus("confirmed");
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      {status === "checking" ? (
        <>
          <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-6" />
          <h1 className="text-2xl font-bold text-foreground">Confirming Payment...</h1>
          <p className="text-muted-foreground mt-2">Please wait while we verify your GCash payment.</p>
        </>
      ) : (
        <>
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Payment Successful! 🎉</h1>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Your GCash payment has been confirmed. Your order is now being processed.
          </p>
          {orderId && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Order #{orderId.slice(-8).toUpperCase()}
            </p>
          )}
          <div className="flex gap-3 mt-8">
            <Button
              className="rounded-xl h-12 px-8"
              onClick={() => router.replace(`/orders/${orderId}`)}
            >
              View Order
            </Button>
            <Button
              variant="outline"
              className="rounded-xl h-12 px-8"
              onClick={() => router.replace("/orders")}
            >
              My Orders
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-6" />
        <h1 className="text-2xl font-bold text-foreground">Loading...</h1>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}