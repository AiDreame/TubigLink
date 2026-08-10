import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Notification types surfaced by the in-app bell.
 *  ORDER_NEW    -> a new order was placed with the station
 *  ORDER_STATUS -> an order's status changed (customer)
 *  PAYOUT       -> a payout was sent to the station
 *  DISPUTE      -> a dispute was filed on an order (station)
 *  SYSTEM       -> everything else (payment received, review, promo, ...)
 */
export type NotificationType =
  | "ORDER_NEW"
  | "ORDER_STATUS"
  | "PAYOUT"
  | "DISPUTE"
  | "SYSTEM";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Relative in-app path the notification links to, e.g. /orders/<id>. */
  link?: string | null;
}

/**
 * Create a notification for a user. Fire-and-forget: it never throws, so a
 * notification failure can never break the order/payout flow that triggered
 * it. Pass an optional Prisma transaction client to create inside an existing
 * transaction (webhook handlers).
 */
export async function createNotification(
  input: CreateNotificationInput,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx ?? prisma;
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
    });
  } catch (error) {
    console.error("[notifications] create failed (non-blocking):", error);
  }
}
