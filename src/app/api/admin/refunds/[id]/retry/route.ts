import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createRefund } from "@/lib/paymongo";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const refund = await prisma.refund.findUnique({ where: { id: params.id }, include: { order: true, dispute: true } });
  if (!refund) return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  if (refund.status !== "FAILED") return NextResponse.json({ error: "Only failed refunds can be retried" }, { status: 400 });
  if (!refund.order.paymentId && !refund.order.paymentIntentId) return NextResponse.json({ error: "Manual refund has no PayMongo payment" }, { status: 400 });
  const result = await createRefund({ amountCentavos: refund.amountCentavos, paymentId: refund.order.paymentId || refund.order.paymentIntentId!, reason: "requested_by_customer", idempotencyKey: `refund:${refund.id}`, metadata: { order_id: refund.orderId, ...(refund.dispute ? { dispute_id: refund.dispute.id } : {}) } });
  const updated = result.ok
    ? await prisma.refund.update({ where: { id: refund.id }, data: { status: "PENDING", providerRefundId: result.data.id, failureMessage: null } })
    : await prisma.refund.update({ where: { id: refund.id }, data: { status: "FAILED", failureMessage: result.error.message } });
  return NextResponse.json({ success: result.ok, data: updated, ...(result.ok ? {} : { error: result.error.message }) }, { status: result.ok ? 200 : 502 });
}
