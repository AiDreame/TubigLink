import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
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

    // N-03/N-08 (security audit 2026-08-18): staff identity is resolved from
    // the DB, scoped to THIS order's station — never from JWT staffRole claims
    // (a deactivated or cross-station staffer must not retain powers).
    const isOwner = order.station.userId === userId;
    const isAdmin = userRole === "ADMIN";
    let staffRow: { id: string; role: string } | null = null;
    if (!isOwner && !isAdmin) {
      staffRow = await prisma.stationStaff.findFirst({
        where: { userId, stationId: order.stationId, status: "ACTIVE" },
        select: { id: true, role: true },
      });
    }
    const isStationStaff = !!staffRow;
    const isAssignedDriver = !!staffRow && order.driverId === staffRow.id;

    // Driver can only update to OUT_FOR_DELIVERY or DELIVERED, and only for assigned orders
    if (isAssignedDriver && staffRow && (staffRow.role === "DRIVER" || staffRow.role === "STAFF")) {
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
        ...(status === "DELIVERED"
          ? {
              // Evidence timestamp — set once at delivery time.
              deliveredAt: order.deliveredAt ?? new Date(),
              // M4 rule: only COD is collected at the door. Prepaid statuses
              // (GCash) are authoritative from PayMongo — never marked PAID here.
              ...(order.paymentMethod === "COD"
                ? { paymentStatus: "PAID", paymentPaidAt: new Date() }
                : {}),
            }
          : {}),
      },
      include: {
        items: { include: { product: true } },
        station: { select: { name: true } },
      },
    });

    // Notify the customer about status change
    await createNotification({
      userId: updatedOrder.userId,
      type: "ORDER_STATUS",
      title: `Order ${status.replace(/_/g, " ").toLowerCase()}`,
      body: `Your order from ${updatedOrder.station.name} is now: ${status.replace(/_/g, " ").toLowerCase()}`,
      link: `/orders/${updatedOrder.id}`,
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
