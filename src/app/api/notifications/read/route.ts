import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/notifications/read — Mark one notification as read ({ id }) or
// mark all as read ({ all: true }). Only the caller's own notifications are
// touched. Returns the updated unread count.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const { id, all } = body || {};
    if (all === true) {
      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
    } else if (typeof id === "string" && id.length > 0) {
      await prisma.notification.updateMany({
        where: { id, userId },
        data: { readAt: new Date() },
      });
    } else {
      return NextResponse.json(
        { error: "Provide { id } or { all: true }" },
        { status: 400 }
      );
    }
    const unreadCount = await prisma.notification.count({
      where: { userId, readAt: null },
    });
    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    console.error("Notifications mark-read error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
