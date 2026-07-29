import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// PUT /api/dashboard/orders/[id] — Station owner, staff, or driver updating order
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

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { station: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const staffId = (session.user as any).staffId;
    const staffRole = (session.user as any).staffRole;

    const isOwner = order.station.userId === userId;
    const isAdmin = userRole === "ADMIN";
    const isAssignedDriver = order.driverId && order.driverId === staffId;
    const isStationStaff = staffRole === "ADMIN" || staffRole === "MANAGER" || staffRole === "STAFF";

    // Driver can only update to OUT_FOR_DELIVERY or DELIVERED, and only for assigned orders
    if (isAssignedDriver && (staffRole === "DRIVER" || staffRole === "STAFF")) {
      if (status !== "OUT_FOR_DELIVERY" && status !== "DELIVERED") {
        return NextResponse.json(
          { error: "Drivers can only start or complete deliveries" },
          { status: 403 }
        );
      }
    } else if (!isOwner && !isAdmin && !isStationStaff) {
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

    // Notify the customer about status change
    await prisma.notification.create({
      data: {
        userId: updatedOrder.userId,
        type: "ORDER_STATUS",
        title: `Order ${status.replace("_", " ").toLowerCase()}`,
        message: `Your order from ${updatedOrder.station.name} is now: ${status.replace("_", " ").toLowerCase()}`,
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
