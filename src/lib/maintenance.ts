import prisma from "@/lib/prisma";
import {
  applyDeliveryAutoConfirmMany,
  DELIVERY_AUTO_CONFIRM_HOURS,
} from "@/lib/delivery";
import { applyAutoEscalateMany } from "@/lib/disputes";

// Scheduled lazy-state convergence (audit I3, owner-approved fix).
// The 24h delivery auto-confirm fallback and the 24h dispute auto-escalation
// are normally applied lazily on reads (delivery.ts / disputes.ts). This module
// converges them on a timer so never-read rows still settle, and the
// payout-prepare route uses applyDeliveryAutoConfirmMany before filtering.
//
// Idempotent by construction: every pass re-queries only rows that are still
// due (DELIVERED + no deliveryConfirmedAt, OPEN + past deadline), and the
// shared helpers skip anything already finalized.

/** How often the in-process scheduler (src/instrumentation.ts) runs a pass. */
export const MAINTENANCE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const HOUR_MS = 60 * 60 * 1000;

export interface MaintenanceResult {
  autoConfirmed: number;
  escalated: number;
}

/** Apply the 24h auto-confirm fallback to every order that is due. Returns rows changed. */
async function autoConfirmDueDeliveries(): Promise<number> {
  const due = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      deliveredAt: {
        not: null,
        lte: new Date(Date.now() - DELIVERY_AUTO_CONFIRM_HOURS * HOUR_MS),
      },
      deliveryConfirmedAt: null,
    },
    select: { id: true, status: true, deliveredAt: true, deliveryConfirmedAt: true },
  });
  if (due.length === 0) return 0;
  const updated = await applyDeliveryAutoConfirmMany(due);
  return updated.filter((o) => o.deliveryConfirmedAt).length;
}

/** Escalate every OPEN dispute past its response deadline. Returns rows changed. */
async function escalateDueDisputes(): Promise<number> {
  const due = await prisma.dispute.findMany({
    where: { status: "OPEN", responseDeadlineAt: { lt: new Date() } },
    select: { id: true, status: true, responseDeadlineAt: true },
  });
  if (due.length === 0) return 0;
  const updated = await applyAutoEscalateMany(due);
  return updated.filter((d) => d.status === "UNDER_REVIEW").length;
}

/**
 * Run one maintenance pass. Safe to call repeatedly — rows already finalized
 * are untouched (counts drop to 0 on the next pass).
 */
export async function runScheduledMaintenance(): Promise<MaintenanceResult> {
  const [autoConfirmed, escalated] = await Promise.all([
    autoConfirmDueDeliveries(),
    escalateDueDisputes(),
  ]);
  return { autoConfirmed, escalated };
}
