import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// POST /api/stations/[id]/contact — Public "Contact <station>" form (N-09).
//
// No auth required: ANY website visitor may message the station owner through
// this route, replacing the old owner name/phone surface on the storefront.
// The message lands as a support-type ticket owned by the station OWNER (the
// station's userId) plus a SUPPORT notification, so it shows up in the
// owner's normal notifications/support surface.
//
// Privacy: no PII beyond visitor name + message. Name is truncated to 80
// chars, message capped at 2000 chars, rate-limited per IP (10/hr) to stop
// abuse. If the visitor happens to be logged in we also record their userId —
// otherwise the ticket creator is the station owner and the visitor is only a
// name in the conversation.
const MAX_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 2000;

const cleanText = (v: unknown, max: number): string =>
  typeof v === "string"
    ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "").trim().slice(0, max)
    : "";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Per-IP throttle BEFORE any DB work (S-05 pattern).
    const rl = rateLimit(`station-contact:${clientIp(req)}`, 10, 60 * 60 * 1000);
    if (!rl.ok) {
      return tooManyRequests(
        "You've sent too many messages. Please try again later.",
        rl.retryAfterSec
      );
    }

    const body = await req.json().catch(() => ({}));
    const name = cleanText(body.name, MAX_NAME_LENGTH);
    const message = cleanText(body.message, MAX_MESSAGE_LENGTH);

    if (!name || !message) {
      return NextResponse.json(
        { error: "Your name and message are required" },
        { status: 400 }
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      );
    }

    const station = await prisma.station.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, name: true, slug: true, userId: true },
    });
    if (!station) {
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    // Optional: if the visitor is logged in, remember who they are (a user id
    // is not public; the ticket simply gets a richer author trail).
    const session = await getServerSession(authOptions);
    const visitorUserId = (session?.user as any)?.id || null;

    const category = "OTHER";
    const description = `[Storefront contact]\n\nVisitor: ${name}${visitorUserId ? ` (user id ${visitorUserId})` : ""}\n\n${message}`;

    // The ticket is owned by the station OWNER so they see it in their normal
    // support surface (the creator is allowed to view/reply in-app).
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: station.userId,
        category,
        description,
        status: "OPEN",
      },
    });

    // Seed the conversation with the visitor's message. authorRole=VISITOR is
    // a distinct public-storefront role (renders as "Visitor" in the support
    // conversation — not "You" and not "Station"), authorName is the visitor's
    // given display name.
    await prisma.disputeMessage.create({
      data: {
        ticketId: ticket.id,
        authorRole: "VISITOR",
        authorName: name,
        content: message,
      },
    });

    // Ping the owner via their normal in-app notification bell.
    await createNotification({
      userId: station.userId,
      type: "SUPPORT",
      title: "New message: " + station.name,
      body: `${name}: ${message.slice(0, 120)}${message.length > 120 ? "…" : ""}`,
      link: `/support/${ticket.id}`,
    });

    return NextResponse.json(
      { success: true, data: { id: ticket.id, status: ticket.status } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Station contact error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send your message. Please try again." },
      { status: 500 }
    );
  }
}