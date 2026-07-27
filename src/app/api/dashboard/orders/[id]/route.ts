import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrderStatusNotification } from "@/lib/notifications";

// PUT /api/dashboard/orders/[id] — Station owner accepting or updating order
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    const validStatuses = [
      "PENDING", "ACCEPTED", "PREPARING",
      "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Check if order exists and belongs to the user's station
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { station: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only the station owner or an admin can update the order from dashboard
    if (order.station.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status,
        ...(status === "DELIVERED" ? { paymentStatus: "PAID" } : {}),
      },
      include: {
        items: { include: { product: true } },
        station: { select: { name: true } },
      },
    });

    // Notify the customer about status change with human-friendly message
    const notification = getOrderStatusNotification(status, updatedOrder.station.name, updatedOrder.id);
    await prisma.notification.create({
      data: {
        userId: updatedOrder.userId,
        type: "ORDER_STATUS",
        title: notification.title,
        message: notification.message,
        data: JSON.stringify({ orderId: updatedOrder.id, status }),
      },
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error("Dashboard order update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    );
  }
}
