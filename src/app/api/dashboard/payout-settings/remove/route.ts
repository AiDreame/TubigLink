import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { verifyOtp } from "@/lib/payout-security";

export async function POST(req: NextRequest) {
  const user: any = (await getServerSession(authOptions))?.user;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const station = await prisma.station.findFirst({
    where: user.role === "ADMIN" && body.stationId ? { id: body.stationId } : { userId: user.id },
  });
  if (!station || (user.role !== "ADMIN" && station.userId !== user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await verifyOtp(station.userId, "PAYOUT_REMOVE", body.code))) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  await prisma.station.update({ where: { id: station.id }, data: { payoutMethod: null, payoutAccountName: null, payoutAccountLast4: null, payoutDetails: null } });
  return NextResponse.json({ success: true });
}
