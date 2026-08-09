import prisma from "@/lib/prisma";

export const ACTIVE_DISPUTE_STATUSES = ["OPEN", "STATION_RESPONDED", "UNDER_REVIEW", "REFUND_PENDING"];
const escalationMessage = "Auto-escalated: no station response within 24h";

export async function applyAutoEscalate(dispute: any): Promise<any> {
  if (!dispute || dispute.status !== "OPEN" || new Date(dispute.responseDeadlineAt) >= new Date()) return dispute;
  const updated = await prisma.dispute.update({ where: { id: dispute.id }, data: { status: "UNDER_REVIEW", resolution: escalationMessage } });
  return { ...dispute, ...updated };
}
export async function applyAutoEscalateMany(disputes: any[]): Promise<any[]> {
  const updated = await Promise.all((disputes || []).map(applyAutoEscalate));
  return updated;
}
export async function getActiveHoldsCentavos(stationId: string): Promise<number> {
  const result = await prisma.dispute.aggregate({ where: { stationId, status: { in: ACTIVE_DISPUTE_STATUSES } }, _sum: { amountHeldCentavos: true } });
  return result._sum.amountHeldCentavos || 0;
}
export function orderNetCentavos(order: any): number {
  if (order.stationNetCentavos != null) return order.stationNetCentavos;
  const gross = order.amountCentavos ?? Math.round(((order.subtotal || 0) + (order.deliveryFee || 0)) * 100);
  const commission = order.commissionCentavos ?? Math.round(gross * 150 / 10000);
  const fee = order.processingFeeCentavos ?? 0;
  return Math.max(0, gross - commission - fee);
}
export { escalationMessage };
