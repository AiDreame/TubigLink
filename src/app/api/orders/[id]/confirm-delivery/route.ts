import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deliveryTimeline } from "@/lib/delivery";

// POST /api/orders/[orderId]/confirm-delivery — Customer confirms their delivery.
//
// Only the authenticated customer who owns the order may confirm, only while the
// order is DELIVERED and not already confirmed. Success (in a transaction):
//   deliveryConfirmedAt = now
//   disputeDeadlineAt   = now + 36h
//   payoutEligibleAt    = disputeDeadlineAt
// All timeline math is server-side — client input is never trusted.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        status: true,
        deliveredAt: true,
        deliveryConfirmedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only confirm your own deliveries" },
        { status: 403 }
      );
    }

    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        {
          success: false,
          error: "Delivery can only be confirmed after the order is delivered",
        },
        { status: 400 }
      );
    }

    if (order.deliveryConfirmedAt) {
      return NextResponse.json(
        { success: false, error: "Delivery already confirmed" },
        { status: 400 }
      );
    }

    const confirmedAt = new Date();
    const timeline = deliveryTimeline(order.deliveredAt ?? confirmedAt, confirmedAt);

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          deliveryConfirmedAt: timeline.deliveryConfirmedAt,
          disputeDeadlineAt: timeline.disputeDeadlineAt,
          payoutEligibleAt: timeline.payoutEligibleAt,
        },
      }),
    ]);

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: { include: { product: true } },
        station: {
          select: { id: true, name: true, slug: true, logo: true, phone: true },
        },
        address: true,
        review: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Confirm delivery error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm delivery" },
      { status: 500 }
    );
  }
}
