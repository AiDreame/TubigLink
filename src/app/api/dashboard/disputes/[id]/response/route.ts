import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pushDisputeMessage } from "@/lib/discord";
import { createNotification, notifyAllAdmins } from "@/lib/notifications";
import { applyAutoEscalate } from "@/lib/disputes";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const d = await prisma.dispute.findUnique({ where: { id: params.id }, include: { station: { select: { userId: true, name: true } } } });
  if (!d) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  let allowed = user.role === "ADMIN" || d.station.userId === user.id;
  if (!allowed) allowed = !!(await prisma.stationStaff.findFirst({ where: { userId: user.id, stationId: d.stationId, status: "ACTIVE" } }));
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (!["OPEN", "STATION_RESPONDED"].includes(d.status)) return NextResponse.json({ error: "Dispute is not awaiting station response" }, { status: 400 });
  if (new Date(d.responseDeadlineAt) < new Date()) {
    await applyAutoEscalate(d);
    return NextResponse.json({ error: "response deadline passed — under review" }, { status: 400 });
  }
  const b = await req.json();
  const response = typeof b.response === "string" ? b.response.trim() : "";
  if (!response || response.length > 4000) return NextResponse.json({ error: "Response is required" }, { status: 400 });
  const evidence = b.evidence == null ? d.evidence : String(b.evidence).trim();
  const updated = await prisma.dispute.update({ where: { id: d.id }, data: { stationResponse: response, evidence, stationRespondedAt: new Date(), status: "STATION_RESPONDED" } });

  // Record the station's formal reply in the in-app conversation AND let the
  // existing mirror path carry it into the bound Discord thread (fire-and-forget,
  // never blocks or fails the request). Matches the customer/support reply flow.
  const authorName = (d.station?.name || user.name || "Station").slice(0, 80);
  await prisma.disputeMessage.create({
    data: { disputeId: d.id, authorRole: "STATION", authorName, content: response },
  });
  void pushDisputeMessage({ id: d.id, discordThreadId: d.discordThreadId }, { authorRole: "STATION", authorName, content: response });

  // Notify the customer and every admin that the station has responded.
  await createNotification({
    userId: d.customerId,
    type: "DISPUTE",
    title: "Station responded",
    body: `${d.station?.name || "The station"} responded to your issue report on order #${d.orderId.substring(0, 8)}.`,
    link: `/orders/${d.orderId}`,
  });
  await notifyAllAdmins({
    type: "DISPUTE",
    title: "Station responded to dispute",
    body: `${d.station?.name || "The station"} responded to the dispute on order #${d.orderId.substring(0, 8)}.`,
    link: "/admin/disputes",
  });
  void recordAudit({ actor: { id: user.id, role: user.role || "PROVIDER" }, action: "dispute.reply", entityType: "dispute", entityId: d.id, details: { orderId: d.orderId, authorRole: "STATION" } });
  return NextResponse.json({ success: true, data: updated });
}
