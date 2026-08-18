import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { applyDeliveryAutoConfirmMany } from "@/lib/delivery";

// S-01 (security audit 2026-08-14): all handlers require a session; the acting
// userId always comes from the session, never from query params or the body.

// GET /api/orders/scheduled — List scheduled/recurring orders
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = sessionUser.id;

    const orders = await applyDeliveryAutoConfirmMany(
      await prisma.order.findMany({
        where: {
          userId,
          orderType: "RECURRING",
          status: { not: "CANCELLED" },
        },
        include: {
          items: { include: { product: true } },
          station: { select: { id: true, name: true, slug: true, logo: true } },
          address: true,
        },
        orderBy: { createdAt: "desc" },
      })
    );

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Scheduled orders fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scheduled orders" },
      { status: 500 }
    );
  }
}

// POST /api/orders/scheduled — Create a scheduled/recurring order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = sessionUser.id;

    const body = await req.json();
    const { stationId, items, addressId, paymentMethod, notes, recurringDay } = body;

    if (!stationId || !items?.length || !addressId || !recurringDay) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (userId, stationId, items, addressId, recurringDay)" },
        { status: 400 }
      );
    }

    const validDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    if (!validDays.includes(recurringDay)) {
      return NextResponse.json(
        { success: false, error: "Invalid recurringDay. Must be one of: MON, TUE, WED, THU, FRI, SAT, SUN" },
        { status: 400 }
      );
    }

    // N-07 (security audit 2026-08-18): the address must belong to the session
    // user (mirrors src/app/api/orders/route.ts POST). Otherwise a customer
    // could bind a victim's addressId and read the victim's full address
    // object through their own scheduled-order list.
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address not found" },
        { status: 403 }
      );
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product || !product.isAvailable) {
        return NextResponse.json(
          { success: false, error: `Product ${item.productId} is not available` },
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

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { deliveryFee: true, userId: true },
    });
    if (!station) {
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    const deliveryFee = station.deliveryFee || 0;
    const total = subtotal + deliveryFee;

    const order = await prisma.order.create({
      data: {
        userId,
        stationId,
        addressId,
        paymentMethod: paymentMethod || "COD",
        paymentStatus: "PENDING",
        orderType: "RECURRING",
        recurringDay,
        subtotal,
        deliveryFee,
        total,
        notes: notes || null,
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
      userId: station.userId,
      type: "ORDER_NEW",
      title: "New Scheduled Order",
      body: `New recurring order #${order.id.substring(0, 8)} — every ${recurringDay} — ₱${total.toFixed(2)}`,
      link: "/dashboard/orders",
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error("Scheduled order creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create scheduled order" },
      { status: 500 }
    );
  }
}

// PUT /api/orders/scheduled?id=X — Update a scheduled order (e.g., change day, items)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { recurringDay, paymentMethod, addressId, notes, items } = body;

    // Validate the order exists, is recurring, and belongs to the session user
    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderType: true, userId: true },
    });

    if (!existing || existing.userId !== sessionUser.id) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (existing.orderType !== "RECURRING") {
      return NextResponse.json(
        { success: false, error: "Only recurring orders can be updated" },
        { status: 400 }
      );
    }

    if (recurringDay) {
      const validDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
      if (!validDays.includes(recurringDay)) {
        return NextResponse.json(
          { success: false, error: "Invalid recurringDay" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, any> = {};
    if (recurringDay !== undefined) updateData.recurringDay = recurringDay;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (addressId !== undefined) updateData.addressId = addressId;
    if (notes !== undefined) updateData.notes = notes;

    // If items are being updated, recalculate and replace
    if (items?.length) {
      let subtotal = 0;
      const orderItems = [];
      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || !product.isAvailable) {
          return NextResponse.json(
            { success: false, error: `Product ${item.productId} is not available` },
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

      const station = await prisma.station.findUnique({
        where: { id: (await prisma.order.findUnique({ where: { id }, select: { stationId: true } }))!.stationId },
        select: { deliveryFee: true },
      });
      const deliveryFee = station?.deliveryFee || 0;
      updateData.subtotal = subtotal;
      updateData.deliveryFee = deliveryFee;
      updateData.total = subtotal + deliveryFee;

      // Delete old items and create new ones in a transaction
      await prisma.$transaction([
        prisma.orderItem.deleteMany({ where: { orderId: id } }),
        prisma.order.update({
          where: { id },
          data: {
            ...updateData,
            items: { create: orderItems },
          },
        }),
      ]);

      const updated = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          station: { select: { name: true } },
          address: true,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: true } },
        station: { select: { name: true } },
        address: true,
      },
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Scheduled order update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update scheduled order" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/scheduled?id=X — Cancel a scheduled order
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderType: true, status: true, userId: true, stationId: true },
    });

    if (!existing || existing.userId !== sessionUser.id) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (existing.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "Order is already cancelled" },
        { status: 400 }
      );
    }

    // Soft delete — mark as CANCELLED
    const order = await prisma.order.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: "Scheduled order cancelled",
    });
  } catch (error) {
    console.error("Scheduled order cancellation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel scheduled order" },
      { status: 500 }
    );
  }
}