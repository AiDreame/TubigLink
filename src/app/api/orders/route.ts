import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isProvisional, checkProvisionalLimits } from "@/lib/provisional";

// GET /api/orders — Get user's orders (authenticated)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const stationId = searchParams.get("stationId");
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    const where: any = {};

    if (userId) where.userId = userId;
    if (stationId) where.stationId = stationId;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: true },
        },
        station: {
          select: { id: true, name: true, slug: true, logo: true },
        },
        address: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST /api/orders — Create a new order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, stationId, items, addressId, paymentMethod, notes, orderType, recurringDay } = body;

    // Validate
    if (!userId || !stationId || !items?.length || !addressId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
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
          { error: `Product ${item.productId} is not available` },
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

    // Get station with delivery fee and provisional info
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: {
        deliveryFee: true,
        userId: true,
        onboardingComplete: true,
        provisionalUntil: true,
        isActive: true,
        approvedAt: true,
        tin: true,
      },
    });

    if (!station) {
      return NextResponse.json(
        { error: "Station not found" },
        { status: 404 }
      );
    }

    if (!station.isActive) {
      return NextResponse.json(
        { error: "Station is not currently active" },
        { status: 403 }
      );
    }

    if (!station.tin) {
      return NextResponse.json(
        { error: "This station has not completed BIR registration. Please contact the station owner." },
        { status: 403 }
      );
    }

    // Check if station is in provisional mode and enforce limits
    if (isProvisional(station)) {
      const limitCheck = await checkProvisionalLimits(stationId, userId);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: limitCheck.reason },
          { status: 403 }
        );
      }
    }

    const deliveryFee = station.deliveryFee || 0;
    const total = subtotal + deliveryFee;

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        stationId,
        addressId,
        paymentMethod: paymentMethod || "COD",
        paymentStatus: "PENDING",
        orderType: orderType || "ONCE",
        recurringDay: recurringDay || null,
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

    // Create notification for the station (only for COD — paid on delivery)
    // For non-COD methods (GCASH, CARD, PAYMAYA), notification is sent after payment confirmation
    const isCod = (paymentMethod || "COD") === "COD";
    if (isCod) {
      await prisma.notification.create({
        data: {
          userId: station.userId, // Station owner
          type: "ORDER_STATUS",
          title: "New Order Received",
          message: `New order #${order.id.substring(0, 8)} — ₱${total.toFixed(2)}`,
          data: JSON.stringify({ orderId: order.id }),
        },
      });
    }

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}