import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// POST /api/orders/[id]/reorder — Create a new order from a past order
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch the original order with items
    const originalOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        station: { select: { id: true, deliveryFee: true, isActive: true, userId: true } },
      },
    });

    if (!originalOrder) {
      return NextResponse.json(
        { success: false, error: "Original order not found" },
        { status: 404 }
      );
    }

    if (!originalOrder.station.isActive) {
      return NextResponse.json(
        { success: false, error: "Station is no longer active" },
        { status: 400 }
      );
    }

    // Verify all products are still available
    const orderItems = [];
    let subtotal = 0;
    for (const item of originalOrder.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product || !product.isAvailable) {
        return NextResponse.json(
          { success: false, error: `Product ${product?.name || item.productId} is no longer available` },
          { status: 400 }
        );
      }
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    const deliveryFee = originalOrder.station.deliveryFee || 0;
    const total = subtotal + deliveryFee;

    // Create the new order with the same items and address
    const order = await prisma.order.create({
      data: {
        userId: originalOrder.userId,
        stationId: originalOrder.stationId,
        addressId: originalOrder.addressId,
        paymentMethod: originalOrder.paymentMethod,
        paymentStatus: "PENDING",
        orderType: "ONCE",
        subtotal,
        deliveryFee,
        total,
        notes: originalOrder.notes ? `Reorder from #${params.id.substring(0, 8)}: ${originalOrder.notes}` : `Reorder from #${params.id.substring(0, 8)}`,
        status: "PENDING",
        items: {
          create: orderItems,
        },
      },
      include: {
        items: { include: { product: true } },
        station: { select: { name: true } },
        address: true,
      },
    });

    // Notify the station
    await createNotification({
      userId: originalOrder.station.userId,
      type: "ORDER_NEW",
      title: "Reorder Received",
      body: `Reorder #${order.id.substring(0, 8)} — ₱${total.toFixed(2)} (from #${params.id.substring(0, 8)})`,
      link: "/dashboard/orders",
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reorder" },
      { status: 500 }
    );
  }
}