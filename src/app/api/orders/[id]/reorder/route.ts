import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// POST /api/orders/[id]/reorder — Create a new order from a past order
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth: only the order's owner may reorder it. 404 (not 403) for a
    // foreign order so other customers' order ids don't leak existence.
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch the original order with items
    const originalOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        station: { select: { id: true, deliveryFee: true, isActive: true, userId: true } },
      },
    });

    if (!originalOrder || originalOrder.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Original order not found" },
        { status: 404 }
      );
    }

    // Guard: the delivery address must still belong to the caller. The
    // original order already belongs to them so this should always pass, but
    // it keeps the new order from referencing a foreign address.
    const address = await prisma.address.findFirst({
      where: { id: originalOrder.addressId, userId: user.id },
    });
    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address not found" },
        { status: 400 }
      );
    }

    if (!originalOrder.station) {
      return NextResponse.json(
        { success: false, error: "Station is no longer available" },
        { status: 400 }
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

    // Create the new order with the same items and address. The caller's id
    // is used (it equals the original owner after the guard above). For GCash
    // orders, amountCentavos is REQUIRED by PayMongo when the payment intent
    // is initialized.
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        stationId: originalOrder.stationId,
        addressId: originalOrder.addressId,
        paymentMethod: originalOrder.paymentMethod,
        paymentStatus: "PENDING",
        orderType: "ONCE",
        subtotal,
        deliveryFee,
        total,
        amountCentavos: Math.round(total * 100),
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

    // GCash orders need a payment step — signal the client to initialize the
    // PayMongo intent, exactly like the normal checkout flow. COD returns as
    // before (no payment step).
    const isGcash = String(order.paymentMethod || "").toUpperCase() === "GCASH";
    return NextResponse.json(
      { success: true, data: order, ...(isGcash ? { nextAction: "INITIALIZE_PAYMENT" } : {}) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reorder" },
      { status: 500 }
    );
  }
}