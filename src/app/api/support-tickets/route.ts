import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification, notifyAllAdmins } from "@/lib/notifications";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { pushSupportTicketCreated } from "@/lib/discord";
import { recordAudit } from "@/lib/audit";

/**
 * General support tickets (owner direction, Aug 19): opened from a floating
 * "Report an issue" button on ANY page. Unlike a Dispute, a ticket is NOT
 * order-bound — an order link is optional. The same Discord thread + two-way
 * reply sync (via DisputeMessage) applies.
 *
 * SECURITY: session-gated; the (optional) linked order must belong to the
 * reporter (N-07 class ownership check). Incoming Discord sync stays behind the
 * HMAC/Bearer webhook — this route is not a message-injection vector.
 */
const CATEGORIES = [
  "ORDER_PROBLEM",
  "PAYMENT",
  "DELIVERY",
  "ACCOUNT",
  "APP_BUG",
  "OTHER",
];

export async function POST(req: NextRequest) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // FAB audience: customers and providers (admins have their own console).
  if (user.role !== "CUSTOMER" && user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rl = rateLimit(`support-create:${user.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return tooManyRequests(
      "You've filed too many issue reports recently. Please try again later.",
      rl.retryAfterSec
    );
  }

  const body = await req.json().catch(() => ({}));
  const category = String(body.category || "");
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const orderId = body.orderId == null ? null : String(body.orderId).trim();

  if (!CATEGORIES.includes(category) || !description || description.length > 2000) {
    return NextResponse.json({ error: "Valid issue category and description are required (max 2000 chars)" }, { status: 400 });
  }

  // Optional order link — MUST belong to the reporter (N-07 class ownership).
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
  }

  const ticket = await prisma.supportTicket.create({
    data: { userId: user.id, orderId: orderId || null, category, description, status: "OPEN" },
  });

  // Seed the support conversation with the reporter's issue, then mirror it
  // into the Discord support thread (fire-and-forget; no-op when unconfigured).
  const authorRole = user.role === "PROVIDER" ? "STATION" : "CUSTOMER";
  const authorName = (user.name || user.phone || authorRole).slice(0, 80);
  await prisma.disputeMessage.create({
    data: { ticketId: ticket.id, authorRole, authorName, content: description },
  });
  void pushSupportTicketCreated(
    { id: ticket.id, orderId: orderId || null, category, description },
    { reporterName: authorName, reporterLabel: user.role === "PROVIDER" ? "Station" : "Customer" }
  );

  // Notify every admin (role-appropriate link) + a confirmation for the reporter.
  await notifyAllAdmins({
    type: "SUPPORT",
    title: "New support ticket",
    body: `${authorName} filed a support ticket (${category.replace(/_/g, " ")}).`,
    link: "/admin/support",
  });
  await createNotification({
    userId: user.id,
    type: "SUPPORT",
    title: "Issue report received",
    body: "We received your issue report. AquaLink support will reply here shortly.",
    link: `/support/${ticket.id}`,
  });

  void recordAudit({ actor: { id: user.id, role: user.role || "CUSTOMER" }, action: "dispute.create", entityType: "supportTicket", entityId: ticket.id, details: { category, orderId: orderId || null } });
  return NextResponse.json({ success: true, data: { id: ticket.id, category, status: ticket.status } });
}

export async function GET() {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Session-scoped: a regular user sees only their own tickets; admins see all.
  const where = user.role === "ADMIN" ? {} : { userId: user.id };
  const tickets = await prisma.supportTicket.findMany({
    where,
    include: { order: { select: { id: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: tickets });
}
