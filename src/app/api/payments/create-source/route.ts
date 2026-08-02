import { NextResponse } from "next/server";
/** @deprecated Use POST /api/payments/gcash/intent with a client-created PaymentMethod. */
export async function POST() {
  return NextResponse.json({ success: false, error: "This legacy endpoint is deprecated. Use /api/payments/gcash/intent." }, { status: 410 });
}
