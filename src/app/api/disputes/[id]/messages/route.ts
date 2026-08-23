import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pushDisputeMessage } from "@/lib/discord";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * Customer / station / admin in-app reply to a dispute's support conversation.
 * Appends a DisputeMessage and, when Discord is configured and a thread is
 * bound, pushes it into that thread (fire-and-forget).
 *
 * Visibility mirrors the existing dispute routes: the customer who filed it,
 * the station owner + active staff, and admins may participate. Only OPEN-ish
 * disputes accept replies.
 */
const REPLYABLE = ["OPEN", "STATION_RESPONDED", "UNDER_REVIEW"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const d = await prisma.dispute.findUnique({ where: { id: params.id }, include: { station: { select: { userId: true } } } });
  if (!d) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  const ownsStation = !!(await prisma.station.findFirst({ where: { userId: user.id }, select: { id: true } }));
  const isStaff = !!(await prisma.stationStaff.findFirst({ where: { userId: user.id, stationId: d.stationId, status: "ACTIVE" } }));
  const allowed = d.customerId === user.id || user.role === "ADMIN" || ownsStation || isStaff;
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const messages = await prisma.disputeMessage.findMany({
    where: { disputeId: d.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ success: true, data: messages });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`dispute-reply:${user.id}:${params.id}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return tooManyRequests("You've sent too many messages recently. Please try again later.", rl.retryAfterSec);

  const d = await prisma.dispute.findUnique({ where: { id: params.id }, include: { station: { select: { id: true, userId: true, name: true } } } });
  if (!d) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  let isStaff = !!(await prisma.stationStaff.findFirst({ where: { userId: user.id, stationId: d.stationId, status: "ACTIVE" } }));
  const allowed =
    d.customerId === user.id ||
    user.role === "ADMIN" ||
    d.station.userId === user.id ||
    isStaff;
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (!REPLYABLE.includes(d.status)) {
    return NextResponse.json({ error: "This issue is no longer open for replies" }, { status: 400 });
  }

  const b = await req.json().catch(() => ({}));
  const content = typeof b.content === "string" ? b.content.trim() : "";
  if (!content || content.length > 4000) {
    return NextResponse.json({ error: "Message is required (max 4000 chars)" }, { status: 400 });
  }

  const authorRole =
    user.id === d.customerId ? "CUSTOMER" : user.role === "ADMIN" ? "ADMIN" : "STATION";
  const authorName = (user.name || user.phone || authorRole).slice(0, 80);

  const message = await prisma.disputeMessage.create({
    data: { disputeId: d.id, authorRole, authorName, content },
  });

  // Push into the Discord thread once available; never block or fail the request.
  void pushDisputeMessage({ id: d.id, discordThreadId: d.discordThreadId }, { authorRole, authorName, content });

  return NextResponse.json({ success: true, data: message });
}
