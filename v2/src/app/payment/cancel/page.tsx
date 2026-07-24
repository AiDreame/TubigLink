"use client";
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function PaymentCancelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
        <XCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Payment Cancelled</h1>
      <p className="text-muted-foreground mt-2 max-w-sm">
        Your GCash payment was not completed. You can try again or choose a different payment method.
      </p>
      {orderId && (
        <p className="text-xs text-muted-foreground mt-2 font-mono">
          Order #{orderId.slice(-8).toUpperCase()}
        </p>
      )}
      <div className="flex gap-3 mt-8">
        <Button
          className="rounded-xl h-12 px-8"
          onClick={() => router.replace("/cart")}
        >
          Try Again
        </Button>
        <Button
          variant="outline"
          className="rounded-xl h-12 px-8"
          onClick={() => router.replace("/orders")}
        >
          My Orders
        </Button>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-6" />
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}