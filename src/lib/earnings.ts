import prisma from "@/lib/prisma";
import { getActiveHoldsCentavos, ACTIVE_DISPUTE_STATUSES, orderNetCentavos } from "@/lib/disputes";

export async function getStationEarnings(stationId: string) {
  const now = new Date();
  const [availableOrders, pendingItems, holds, paid, payouts, transactions] = await Promise.all([
    prisma.order.findMany({ where: { stationId, status: "DELIVERED", paymentStatus: "PAID", payoutEligibleAt: { not: null, lte: now }, payoutItems: { none: {} }, disputes: { none: { status: { in: ACTIVE_DISPUTE_STATUSES } } } }, select: { id:true, amountCentavos: true, stationNetCentavos: true, subtotal: true, deliveryFee: true, commissionCentavos: true, processingFeeCentavos:true } }),
    prisma.payoutItem.findMany({ where: { payout: { stationId, status: { in: ["DRAFT", "APPROVED", "PROCESSING", "PAYING"] } } }, include: { payout: { select: { status: true, paidAt: true } }, order: { select: { id: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    getActiveHoldsCentavos(stationId),
    prisma.payout.aggregate({ where: { stationId, status: "PAID" }, _sum: { netCentavos: true } }),
    prisma.payout.findMany({ where: { stationId }, include: { _count: { select: { payoutItems: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.payoutItem.findMany({ where: { payout: { stationId } }, include: { payout: { select: { status: true, paidAt: true } }, order: { select: { id: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const availableCentavos = availableOrders.reduce((s, o) => s + orderNetCentavos(o), 0);
  const pendingCentavos = pendingItems.reduce((s, i) => s + i.netCentavos, 0);
  const paidCentavos = paid._sum.netCentavos || 0;
  return { availableCentavos, pendingCentavos, heldCentavos: holds, paidCentavos, totalEarnedCentavos: paidCentavos + pendingCentavos, commissionRateBps: 150,
    payouts: payouts.map(p => ({ id:p.id,status:p.status,periodStart:p.periodStart,periodEnd:p.periodEnd,grossCentavos:p.grossCentavos,commissionCentavos:p.commissionCentavos,processingFeeCentavos:p.processingFeeCentavos,disbursementFeeCentavos:p.disbursementFeeCentavos,heldCentavos:p.heldCentavos,adjustmentCentavos:p.adjustmentCentavos,netCentavos:p.netCentavos,paidAt:p.paidAt,transferReference:p.transferReference,failureMessage:p.failureMessage,paymongoTransactionId:p.paymongoTransactionId,paymongoReferenceNumber:p.paymongoReferenceNumber,paymongoStatus:p.paymongoStatus,paymongoError:p.paymongoError,itemCount:p._count.payoutItems })),
    recentTransactions: transactions.map(i => ({ id:i.id, orderId:i.orderId, orderRef:i.orderId.slice(-8), grossCentavos:i.grossCentavos, processingFeeCentavos:i.processingFeeCentavos, commissionCentavos:i.commissionCentavos, heldCentavos:i.heldCentavos, netCentavos:i.netCentavos, payoutStatus:i.payout.status, paidAt:i.payout.paidAt, createdAt:i.order.createdAt })) };
}
