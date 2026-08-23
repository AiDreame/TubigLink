import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Notification types surfaced by the in-app bell.
 *  ORDER_NEW    -> a new order was placed with the station
 *  ORDER_STATUS -> an order's status changed (customer)
 *  PAYOUT       -> a payout was sent to the station
 *  DISPUTE      -> a dispute was filed on an order (station)
 *  SUPPORT      -> a general support ticket / support reply (Aug 19)
 *  SYSTEM       -> everything else (payment received, review, promo, ...)
 */
export type NotificationType =
  | "ORDER_NEW"
  | "ORDER_STATUS"
  | "PAYOUT"
  | "DISPUTE"
  | "SUPPORT"
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

/**
 * Notify everyone attached to a station: the station owner plus every ACTIVE
 * staff member who has linked their user account. Deduplicates by userId.
 * Fire-and-forget like createNotification (never throws).
 */
export async function notifyStationUsers(
  stationId: string,
  input: Omit<CreateNotificationInput, "userId">,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx ?? prisma;
  try {
    const [station, staff] = await Promise.all([
      db.station.findUnique({
        where: { id: stationId },
        select: { userId: true },
      }),
      db.stationStaff.findMany({
        where: { stationId, status: "ACTIVE", userId: { not: null } },
        select: { userId: true },
      }),
    ]);
    const userIds = Array.from(
      new Set(
        [station?.userId, ...staff.map((s) => s.userId)].filter(
          (u): u is string => typeof u === "string" && u.length > 0
        )
      )
    );
    await Promise.all(
      userIds.map((uid) => createNotification({ ...input, userId: uid }, tx))
    );
  } catch (error) {
    console.error("[notifications] notifyStationUsers failed (non-blocking):", error);
  }
}

/**
 * Notify every ADMIN user in the system. Fire-and-forget (never throws).
 */
export async function notifyAllAdmins(
  input: Omit<CreateNotificationInput, "userId">,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx ?? prisma;
  try {
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) => createNotification({ ...input, userId: a.id }, tx))
    );
  } catch (error) {
    console.error("[notifications] notifyAllAdmins failed (non-blocking):", error);
  }
}
