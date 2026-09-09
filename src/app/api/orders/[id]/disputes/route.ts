import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification, notifyAllAdmins, notifyStationUsers } from "@/lib/notifications";
import { applyAutoEscalateMany, orderNetCentavos } from "@/lib/disputes";
import { DISPUTE_WINDOW_HOURS } from "@/lib/delivery";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { pushDisputeCreated } from "@/lib/discord";
import { recordAudit } from "@/lib/audit";

const types = ["NOT_DELIVERED", "QUALITY", "OTHER"];
const include = { order: { select: { id: true, total: true, paymentStatus: true, deliveryConfirmedAt: true } }, customer: { select: { id: true, name: true, phone: true } }, station: { select: { id: true, name: true } }, refund: true, messages: { orderBy: { createdAt: "asc" } } } as const;
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const order = await prisma.order.findUnique({ where: { id: params.id }, select: { userId: true, stationId: true, station: { select: { userId: true } } } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  let allowed = order.userId === user.id || user.role === "ADMIN" || order.station.userId === user.id;
  if (!allowed) allowed = !!(await prisma.stationStaff.findFirst({ where: { userId: user.id, stationId: order.stationId, status: "ACTIVE" } }));
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const disputes = await prisma.dispute.findMany({ where: { orderId: params.id }, include, orderBy: { openedAt: "desc" } });
  return NextResponse.json({ success: true, data: await applyAutoEscalateMany(disputes) });
}
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // S-05 (security audit 2026-08-14): per-user cap on dispute creation — 10 /
  // hour (token bucket). Spam disputes would bury station staff and admins.
  const rl = rateLimit(`dispute-create:${user.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return tooManyRequests(
      "You've filed too many issue reports recently. Please try again later.",
      rl.retryAfterSec
    );
  }
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { station: { select: { id: true, name: true, userId: true } }, items: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.userId !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const now = new Date();
  if (order.paymentStatus !== "PAID") return NextResponse.json({ error: "Payment for this order isn't confirmed yet." }, { status: 400 });
  if (!order.deliveredAt) return NextResponse.json({ error: "You can report an issue after your order is delivered." }, { status: 400 });
  // Dispute window: the stored post-confirmation deadline once set; before the
  // customer confirms, the window is 36h from delivery so issues can be
  // reported before accepting the delivery (owner, Aug 14).
  const disputeDeadline = order.disputeDeadlineAt ?? new Date(order.deliveredAt.getTime() + DISPUTE_WINDOW_HOURS * 60 * 60 * 1000);
  if (now > disputeDeadline) return NextResponse.json({ error: "The window to report an issue for this order has closed." }, { status: 400 });
  if (await prisma.dispute.findFirst({ where: { orderId: order.id } })) return NextResponse.json({ error: "dispute already open" }, { status: 400 });
  const body = await req.json();
  const type = String(body.type || ""); const description = typeof body.description === "string" ? body.description.trim() : "";
  const evidence = body.evidence == null ? null : String(body.evidence).trim();
  if (!types.includes(type) || !description || description.length > 2000 || (evidence && evidence.length > 4000)) return NextResponse.json({ error: "Invalid dispute details" }, { status: 400 });
  const dispute = await prisma.dispute.create({ data: { orderId: order.id, customerId: user.id, stationId: order.stationId, type, description, evidence, amountHeldCentavos: orderNetCentavos(order), openedAt: now, responseDeadlineAt: new Date(now.getTime() + 24 * 3600000), status: "OPEN" }, include: include });
  // Seed the support conversation with the customer's report, then mirror it
  // into the Discord support thread (fire-and-forget; no-op when unconfigured).
  const customerName = user.name || user.phone || "A customer";
  await prisma.disputeMessage.create({ data: { disputeId: dispute.id, authorRole: "CUSTOMER", authorName: customerName, content: description } });
  void pushDisputeCreated(
    { id: dispute.id, orderId: order.id, type, description },
    { customerName }
  );
  // Notify everyone involved, each with a role-appropriate link:
  //  - station owner + all active staff  -> /dashboard/disputes
  //  - every admin                       -> /admin/disputes
  //  - the customer (confirmation)       -> /orders/<id>
  const stationName = order.station?.name || "the station";
  await notifyStationUsers(order.stationId, {
    type: "DISPUTE",
    title: "Dispute filed",
    body: `${customerName} filed a dispute on order #${order.id.substring(0, 8)} (${type.replace(/_/g, " ")}). Respond within 24 hours.`,
    link: "/dashboard/disputes",
  });
  await notifyAllAdmins({
    type: "DISPUTE",
    title: "Dispute filed",
    body: `${customerName} filed a dispute on order #${order.id.substring(0, 8)} at ${stationName}.`,
    link: "/admin/disputes",
  });
  await createNotification({
    userId: order.userId,
    type: "DISPUTE",
    title: "Issue report received",
    body: `We received your issue report for order #${order.id.substring(0, 8)}. ${stationName} has 24 hours to respond.`,
    link: `/orders/${order.id}`,
  });
  void recordAudit({ actor: { id: user.id, role: user.role || "CUSTOMER" }, action: "dispute.create", entityType: "dispute", entityId: dispute.id, details: { orderId: order.id, stationId: order.stationId, type } });
  return NextResponse.json({ success: true, data: dispute });
}
