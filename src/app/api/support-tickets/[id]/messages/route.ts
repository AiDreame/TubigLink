import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pushDisputeMessage } from "@/lib/discord";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

/**
 * In-app support conversation for a GENERAL support ticket. The creator (the
 * customer or station who filed it) and admins may read and reply; inbound
 * Discord replies arrive as authorRole=STAFF rows via the webhook and render
 * here verbatim (two-way sync).
 *
 * SECURITY: session + ownership-scoped (creator or admin only). The incoming
 * Discord path is the separate HMAC/Bearer webhook, so this route is not an
 * injection vector.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  const allowed = ticket.userId === user.id || user.role === "ADMIN";
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const messages = await prisma.disputeMessage.findMany({
    where: { ticketId: ticket.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ success: true, data: messages });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`support-reply:${user.id}:${params.id}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return tooManyRequests("You've sent too many messages recently. Please try again later.", rl.retryAfterSec);

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  const allowed = ticket.userId === user.id || user.role === "ADMIN";
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (ticket.status === "CLOSED") {
    return NextResponse.json({ error: "This issue is closed" }, { status: 400 });
  }

  const b = await req.json().catch(() => ({}));
  const content = typeof b.content === "string" ? b.content.trim() : "";
  if (!content || content.length > 4000) {
    return NextResponse.json({ error: "Message is required (max 4000 chars)" }, { status: 400 });
  }

  const authorRole = user.role === "ADMIN" ? "ADMIN" : ticket.userId === user.id ? (user.role === "PROVIDER" ? "STATION" : "CUSTOMER") : "STAFF";
  const authorName = (user.name || user.phone || authorRole).slice(0, 80);

  const message = await prisma.disputeMessage.create({
    data: { ticketId: ticket.id, authorRole, authorName, content },
  });

  // Push into the Discord thread once available; never block or fail the request.
  void pushDisputeMessage(
    { id: ticket.id, discordThreadId: ticket.discordThreadId, discordChannelId: ticket.discordChannelId },
    { authorRole, authorName, content }
  );

  void recordAudit({ actor: { id: user.id, role: user.role || "CUSTOMER" }, action: "support.reply", entityType: "supportTicket", entityId: ticket.id, details: { authorRole } });
  return NextResponse.json({ success: true, data: message });
}
