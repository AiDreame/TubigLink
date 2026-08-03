import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyDeliveryAutoConfirm } from "@/lib/delivery";

// GET /api/orders/[id] — Get single order details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        station: {
          select: { id: true, name: true, slug: true, logo: true, phone: true },
        },
        address: true,
        review: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Lazy 24h auto-confirm backfill (safe: deterministic from deliveredAt).
    const withTimeline = await applyDeliveryAutoConfirm(order);

    return NextResponse.json({ success: true, data: withTimeline });
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[id] — Update order status (station owner, station staff, or driver only)
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

    const currentOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: { station: true },
    });
    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Station-scope authorization: owner, admin, active staff, or assigned driver.
    const user = session.user as any;
    const userId = user.id;
    const isOwner = currentOrder.station.userId === userId;
    const isAdmin = user.role === "ADMIN";
    const isAssignedDriver = currentOrder.driverId && currentOrder.driverId === user.staffId;
    let isStationStaff = false;
    if (!isOwner && !isAdmin) {
      const staff = await prisma.stationStaff.findFirst({
        where: { userId, stationId: currentOrder.stationId, status: "ACTIVE" },
        select: { id: true, role: true },
      });
      isStationStaff = !!staff;
    }

    if (isAssignedDriver && (user.staffRole === "DRIVER" || user.staffRole === "STAFF")) {
      if (status !== "OUT_FOR_DELIVERY" && status !== "DELIVERED") {
        return NextResponse.json(
          { error: "Drivers can only start or complete deliveries" },
          { status: 403 }
        );
      }
    } else if (!isOwner && !isAdmin && !isStationStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        status,
        ...(status === "DELIVERED"
          ? {
              // Evidence timestamp — set once at delivery time.
              deliveredAt: currentOrder.deliveredAt ?? new Date(),
              // COD is collected at the door. Prepaid statuses are authoritative from PayMongo.
              ...(currentOrder.paymentMethod === "COD"
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
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: "ORDER_STATUS",
        title: `Order ${status.replace("_", " ").toLowerCase()}`,
        message: `Your order from ${order.station.name} is now: ${status.replace("_", " ").toLowerCase()}`,
        data: JSON.stringify({ orderId: order.id, status }),
      },
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] — Cancel a PENDING order (customer only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Load the order
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, status: true, stationId: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify the requester is the order's owner
    if (order.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only cancel your own orders" },
        { status: 403 }
      );
    }

    // Check the order is still PENDING
    if (order.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: "Order can no longer be cancelled — the station has already accepted it",
        },
        { status: 400 }
      );
    }

    // Update status to CANCELLED (soft delete — keeps order in history)
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
      include: {
        items: { include: { product: true } },
        station: { select: { name: true } },
      },
    });

    // Create notification for the customer confirming cancellation
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: "ORDER_STATUS",
        title: "Order cancelled",
        message: `Your order from ${updatedOrder.station.name} has been cancelled as requested.`,
        data: JSON.stringify({ orderId: order.id, status: "CANCELLED" }),
      },
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error("Order cancel error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}