import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { applyAutoEscalateMany, orderNetCentavos } from "@/lib/disputes";

const types = ["NOT_DELIVERED", "QUALITY", "OTHER"];
const include = { order: { select: { id: true, total: true, paymentStatus: true, deliveryConfirmedAt: true } }, customer: { select: { id: true, name: true, phone: true } }, station: { select: { id: true, name: true } }, refund: true } as const;
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
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { station: { select: { id: true, name: true, userId: true } }, items: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.userId !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const now = new Date();
  if (order.paymentStatus !== "PAID") return NextResponse.json({ error: "payment not collected" }, { status: 400 });
  if (!order.deliveryConfirmedAt || !order.disputeDeadlineAt || now > order.disputeDeadlineAt) return NextResponse.json({ error: "dispute window closed" }, { status: 400 });
  if (await prisma.dispute.findFirst({ where: { orderId: order.id } })) return NextResponse.json({ error: "dispute already open" }, { status: 400 });
  const body = await req.json();
  const type = String(body.type || ""); const description = typeof body.description === "string" ? body.description.trim() : "";
  const evidence = body.evidence == null ? null : String(body.evidence).trim();
  if (!types.includes(type) || !description || description.length > 2000 || (evidence && evidence.length > 4000)) return NextResponse.json({ error: "Invalid dispute details" }, { status: 400 });
  const dispute = await prisma.dispute.create({ data: { orderId: order.id, customerId: user.id, stationId: order.stationId, type, description, evidence, amountHeldCentavos: orderNetCentavos(order), openedAt: now, responseDeadlineAt: new Date(now.getTime() + 24 * 3600000), status: "OPEN" }, include: include });
  // Notify the station owner about the filed dispute.
  await createNotification({
    userId: order.station.userId,
    type: "DISPUTE",
    title: "Dispute filed",
    body: `A dispute was filed on order #${order.id.substring(0, 8)}.`,
    link: "/dashboard/disputes",
  });
  return NextResponse.json({ success: true, data: dispute });
}
