import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getPaymentIntent } from "@/lib/paymongo";

export async function GET(_req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    const order = await prisma.order.findUnique({ where: { id: params.orderId }, include: { refunds: true, station: { select: { userId: true, id: true } } } });
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    const staff = await prisma.stationStaff.findFirst({ where: { userId: user.id, stationId: order.stationId, status: "ACTIVE", role: { in: ["MANAGER", "ADMIN"] } } });
    if (order.userId !== user.id && order.station.userId !== user.id && user.role !== "ADMIN" && !staff) return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    let result = order;
    if (order.paymentIntentId && ["PENDING", "REQUIRES_ACTION"].includes(order.paymentStatus)) {
      const remote = await getPaymentIntent(order.paymentIntentId);
      if (remote.ok) {
        const status = String((remote.data.attributes as any)?.status || "").toLowerCase();
        if (["succeeded", "paid"].includes(status)) result = await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", paymentPaidAt: new Date() }, include: { refunds: true, station: { select: { userId: true, id: true } } } });
      }
    }
    return NextResponse.json({ success: true, data: { orderId: result.id, paymentStatus: result.paymentStatus, paymentIntentId: result.paymentIntentId, paidAt: result.paymentPaidAt, refund: result.refunds } });
  } catch (error) { console.error("Payment status error:", error); return NextResponse.json({ success: false, error: "Failed to fetch payment status" }, { status: 500 }); }
}
