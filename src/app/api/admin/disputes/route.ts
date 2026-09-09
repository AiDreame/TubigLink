import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyAutoEscalateMany } from "@/lib/disputes";
import { createRefund } from "@/lib/paymongo";
import { archiveTicketChannel } from "@/lib/discord";
import { recordAudit } from "@/lib/audit";

const include = { order: { select: { id: true, total: true, paymentStatus: true, paymentId: true, paymentIntentId: true } }, customer: { select: { name: true, phone: true } }, station: { select: { id: true, name: true } }, refund: true, messages: { orderBy: { createdAt: "asc" } } } as const;
async function admin() { const u = (await getServerSession(authOptions))?.user as any; return u?.id && u.role === "ADMIN" ? u : null; }
export async function GET() { const u = await admin(); if (!u) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); const rows = await prisma.dispute.findMany({ include, orderBy: { openedAt: "desc" } }); return NextResponse.json({ success: true, data: await applyAutoEscalateMany(rows) }); }
export async function POST(req: NextRequest) {
  const u = await admin(); if (!u) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, decision, note } = await req.json();
  if (!["REFUND_QUALITY", "REFUND_NOT_DELIVERED", "REJECT"].includes(decision)) return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  const d = await prisma.dispute.findUnique({ where: { id }, include: { order: true } });
  if (!d) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  if (!["OPEN", "STATION_RESPONDED", "UNDER_REVIEW"].includes(d.status)) return NextResponse.json({ error: "Dispute already resolved" }, { status: 400 });
  if (decision !== "REJECT" && d.order.paymentStatus !== "PAID") return NextResponse.json({ error: "payment not collected" }, { status: 400 });
  const now = new Date();
  // Both terminal outcomes (REJECTED close, REFUND_PENDING resolution) archive
  // the per-ticket Discord channel into "Closed Tickets" (fire-and-forget,
  // no-op when Discord is unconfigured or no channel exists). REFUNDED is set
  // later by the PayMongo refund webhook — the channel is already archived.
  if (decision === "REJECT") { const dispute = await prisma.dispute.update({ where: { id }, data: { status: "REJECTED", resolution: note ?? "", resolvedAt: now } }); void archiveTicketChannel(d.discordChannelId); void recordAudit({ action: "dispute.close", entityType: "dispute", entityId: id, details: { orderId: d.orderId, decision, before: d.status, after: "REJECTED" } }); return NextResponse.json({ success: true, data: { dispute } }); }
  const result = await prisma.$transaction(async tx => {
    const refund = await tx.refund.create({ data: { orderId: d.orderId, amountCentavos: d.amountHeldCentavos, reason: decision, status: "PENDING", requestedById: u.id } });
    const dispute = await tx.dispute.update({ where: { id }, data: { status: "REFUND_PENDING", resolution: note ?? "", resolvedAt: now, refundId: refund.id } });
    return { dispute, refund };
  });
  const paymentId = d.order.paymentId || d.order.paymentIntentId;
  if (!paymentId) { void archiveTicketChannel(d.discordChannelId); return NextResponse.json({ success: true, data: result, manual: true }); }
  const provider = await createRefund({ amountCentavos: result.refund.amountCentavos, paymentId, reason: "requested_by_customer", idempotencyKey: `refund:${result.refund.id}`, metadata: { order_id: d.orderId, dispute_id: d.id } });
  const refund = provider.ok
    ? await prisma.refund.update({ where: { id: result.refund.id }, data: { providerRefundId: provider.data.id } })
    : await prisma.refund.update({ where: { id: result.refund.id }, data: { status: "FAILED", failureMessage: provider.error.message } });
  void archiveTicketChannel(d.discordChannelId);
  void recordAudit({ action: "dispute.resolve", entityType: "dispute", entityId: id, details: { orderId: d.orderId, decision, refundId: result.refund.id, providerOk: provider.ok } });
  return NextResponse.json({ success: provider.ok, data: { ...result, refund }, ...(provider.ok ? {} : { error: provider.error.message }) }, { status: provider.ok ? 200 : 502 });
}
