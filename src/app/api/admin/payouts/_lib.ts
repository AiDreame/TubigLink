import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function requireAdmin() {
  const user = (await getServerSession(authOptions))?.user as any;
  return user?.id && user.role === "ADMIN" ? user : null;
}
export const payoutInclude = {
  station: { select: { id: true, name: true, userId: true } },
  payoutItems: { include: { order: { select: { id: true, total: true, amountCentavos: true } } }, orderBy: { createdAt: "asc" as const } },
} as const;
export function parsePeriod(body: any) {
  const start = new Date(body?.periodStart), end = new Date(body?.periodEnd);
  if (!body?.periodStart || !body?.periodEnd || isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end || end.getTime() - start.getTime() > 62 * 86400000) return null;
  return { start, end };
}
export function money(order: any) {
  const gross = order.amountCentavos ?? Math.round(order.total * 100);
  const commission = order.commissionCentavos ?? Math.round(gross * 150 / 10000);
  return { gross, commission, net: gross - commission };
}
