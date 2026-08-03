import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { decryptPayout, verifyOtp } from "@/lib/payout-security";

export async function POST(req: NextRequest) {
  const user: any = (await getServerSession(authOptions))?.user;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const station = await prisma.station.findFirst({
    where: user.role === "ADMIN" && body.stationId ? { id: body.stationId } : { userId: user.id },
  });
  if (!station || (user.role !== "ADMIN" && station.userId !== user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await verifyOtp(station.userId, "PAYOUT_REVEAL", body.code))) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  if (!station.payoutDetails) return NextResponse.json({ error: "No payout account" }, { status: 400 });
  return NextResponse.json({ success: true, data: { payoutMethod: station.payoutMethod, payoutAccountName: station.payoutAccountName, accountNumber: JSON.parse(decryptPayout(station.payoutDetails)).accountNumber } });
}
