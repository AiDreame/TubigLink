import prisma from "@/lib/prisma";

// Delivery → confirmation → dispute → payout-eligibility timeline.
// Owner-locked rules (Aug 3, 2026):
//   - Auto-confirm fallback: deliveredAt + 24h  (customer can confirm earlier)
//   - disputeDeadlineAt   = deliveryConfirmedAt + 36h
//   - payoutEligibleAt    = disputeDeadlineAt
// An order is NEVER payout-eligible merely on status DELIVERED.
//
// No scheduler exists (documented in PR): auto-confirm is applied lazily on
// reads via applyDeliveryAutoConfirm / applyDeliveryAutoConfirmMany. This is
// safe because every timestamp is computed deterministically from
// `deliveredAt` — a read after the 24h deadline converges to the same value a
// scheduler would have written.

export const DELIVERY_AUTO_CONFIRM_HOURS = 24;
export const DISPUTE_WINDOW_HOURS = 36;

const HOUR_MS = 60 * 60 * 1000;

/** Deterministic confirmation/dispute/payout timestamps for a delivered order. */
export function deliveryTimeline(deliveredAt: Date, confirmedAt: Date) {
  const disputeDeadlineAt = new Date(
    confirmedAt.getTime() + DISPUTE_WINDOW_HOURS * HOUR_MS
  );
  return {
    deliveryConfirmedAt: confirmedAt,
    disputeDeadlineAt,
    payoutEligibleAt: disputeDeadlineAt,
  };
}

/**
 * Lazily apply the 24h auto-confirm fallback to a single order.
 * Writes only when: status === DELIVERED, deliveredAt is set, no
 * deliveryConfirmedAt yet, and now >= deliveredAt + 24h.
 * Idempotent — safe to call on every read. Returns the (possibly updated)
 * order object; scalar timeline fields are merged onto the loaded row so any
 * existing `include` relations are preserved.
 */
export async function applyDeliveryAutoConfirm(order: any): Promise<any> {
  if (!order || order.status !== "DELIVERED") return order;
  if (!order.deliveredAt || order.deliveryConfirmedAt) return order;

  const deliveredAt = new Date(order.deliveredAt);
  const autoConfirmAt = new Date(
    deliveredAt.getTime() + DELIVERY_AUTO_CONFIRM_HOURS * HOUR_MS
  );
  if (Date.now() < autoConfirmAt.getTime()) return order;

  const timeline = deliveryTimeline(deliveredAt, autoConfirmAt);
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: timeline,
  });
  return { ...order, ...updated };
}

/**
 * Batch version for list reads: backfills only the orders that are due for
 * auto-confirmation and returns the array with the same order/relations intact.
 */
export async function applyDeliveryAutoConfirmMany(orders: any[]): Promise<any[]> {
  if (!orders || orders.length === 0) return orders;
  const due = orders.filter(
    (o) =>
      o.status === "DELIVERED" &&
      o.deliveredAt &&
      !o.deliveryConfirmedAt &&
      Date.now() >=
        new Date(o.deliveredAt).getTime() + DELIVERY_AUTO_CONFIRM_HOURS * HOUR_MS
  );
  if (due.length === 0) return orders;

  const updated = await Promise.all(due.map((o) => applyDeliveryAutoConfirm(o)));
  const byId = new Map(updated.map((o) => [o.id, o]));
  return orders.map((o) => byId.get(o.id) ?? o);
}
