import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const refund = await prisma.refund.findUnique({ where: { id: params.id }, include: { order: true } });
  if (!refund) return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  if (refund.order.paymentId || refund.order.paymentIntentId) return NextResponse.json({ error: "PayMongo refunds complete via webhook" }, { status: 400 });
  const now = new Date();
  const updated = await prisma.$transaction(async tx => {
    const r = await tx.refund.update({ where: { id: refund.id }, data: { status: "SUCCEEDED", completedAt: now } });
    await tx.order.update({ where: { id: refund.orderId }, data: { paymentStatus: "REFUNDED", paymentRefundedAt: now, paymentRefundedAmount: refund.amountCentavos } });
    const dispute = await tx.dispute.findFirst({ where: { refundId: refund.id } });
    if (dispute) await tx.dispute.update({ where: { id: dispute.id }, data: { status: "REFUNDED" } });
    return r;
  });
  return NextResponse.json({ success: true, data: updated });
}
