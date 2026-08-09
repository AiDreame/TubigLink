import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { STATION_PAYMENT_METHOD_IDS, DEFAULT_STATION_PAYMENT_METHODS } from "@/lib/constants";

// GET/POST /api/dashboard/payment-methods — the provider's accepted payment
// methods (which methods customers can use to pay). Not payout-account data,
// so no 2FA is required (see /api/dashboard/payout-settings for that).
function parseAccepted(value: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(value || "null");
    return Array.isArray(arr) ? arr.filter((m) => typeof m === "string") : [];
  } catch {
    return [];
  }
}
async function access(req: NextRequest) {
  const user: any = (await getServerSession(authOptions))?.user;
  if (!user?.id) return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  const station = await prisma.station.findFirst({ where: { userId: user.id } });
  if (!station) return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  return { user, station };
}
export async function GET(req: NextRequest) {
  try {
    const a = await access(req);
    if (a.error) return a.error;
    const accepted = parseAccepted(a.station.acceptedPaymentMethods);
    return NextResponse.json({ success: true, data: { acceptedPaymentMethods: accepted.length ? accepted : DEFAULT_STATION_PAYMENT_METHODS } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    const a = await access(req);
    if (a.error) return a.error;
    const body = await req.json();
    const raw = body?.acceptedPaymentMethods ?? body?.paymentMethods ?? body?.methods;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ success: false, error: "acceptedPaymentMethods must be an array" }, { status: 400 });
    }
    const unique = Array.from(new Set(raw.map((m: any) => String(m))));
    const invalid = unique.filter((m) => !STATION_PAYMENT_METHOD_IDS.includes(m as any));
    if (invalid.length) {
      return NextResponse.json({ success: false, error: `Invalid payment method(s): ${invalid.join(", ")}` }, { status: 400 });
    }
    const updated = await prisma.station.update({
      where: { id: a.station.id },
      data: { acceptedPaymentMethods: JSON.stringify(unique.length ? unique : DEFAULT_STATION_PAYMENT_METHODS) },
    });
    return NextResponse.json({ success: true, data: { acceptedPaymentMethods: parseAccepted(updated.acceptedPaymentMethods) } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
export async function PUT(req: NextRequest) { return POST(req); }
