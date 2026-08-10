import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { isProvisional, checkProvisionalLimits } from "@/lib/provisional";
import { applyDeliveryAutoConfirmMany } from "@/lib/delivery";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const where: any = { userId: user.id };
    if (searchParams.get("stationId")) where.stationId = searchParams.get("stationId");
    if (searchParams.get("status")) where.status = searchParams.get("status");
    let orders = await prisma.order.findMany({ where, include: { items: { include: { product: true } }, station: { select: { id: true, name: true, slug: true, logo: true } }, address: true }, orderBy: { createdAt: "desc" }, take: Math.min(Number(searchParams.get("limit")) || 20, 50) });
    // Lazy 24h auto-confirm backfill on delivered-but-unconfirmed orders.
    orders = await applyDeliveryAutoConfirmMany(orders);
    return NextResponse.json({ success: true, data: orders });
  } catch (error) { console.error("Orders fetch error:", error); return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    const body = await req.json();
    const { stationId, items, addressId, paymentMethod, notes, orderType, recurringDay } = body;
    if (!stationId || !Array.isArray(items) || !items.length || !addressId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    const method = paymentMethod || "COD";
    if (method !== "COD" && method !== "GCASH") return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    const address = await prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
    if (!address) return NextResponse.json({ error: "Address not found" }, { status: 403 });
    const station = await prisma.station.findUnique({ where: { id: stationId }, select: { deliveryFee: true, userId: true, onboardingComplete: true, provisionalUntil: true, isActive: true, approvedAt: true } });
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
    if (!station.isActive) return NextResponse.json({ error: "Station is not currently active" }, { status: 403 });
    if (isProvisional(station)) { const check = await checkProvisionalLimits(stationId, user.id); if (!check.allowed) return NextResponse.json({ error: check.reason }, { status: 403 }); }
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, stationId, isAvailable: true } });
    if (products.length !== productIds.length) return NextResponse.json({ error: "One or more products are unavailable at this station" }, { status: 400 });
    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId);
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1) throw new Error("Invalid product quantity");
      subtotal += product.price * quantity;
      return { productId: product.id, quantity, unitPrice: product.price };
    });
    const deliveryFee = station.deliveryFee || 0;
    const total = subtotal + deliveryFee;
    const order = await prisma.order.create({ data: { userId: user.id, stationId, addressId, paymentMethod: method, paymentStatus: "PENDING", orderType: orderType || "ONCE", recurringDay: recurringDay || null, subtotal, deliveryFee, total, amountCentavos: Math.round(total * 100), notes: notes || null, status: "PENDING", items: { create: orderItems } }, include: { items: { include: { product: true } }, station: { select: { name: true } }, address: true } });
    // Notify the station about the new order (all payment methods).
    await createNotification({
      userId: station.userId,
      type: "ORDER_NEW",
      title: "New Order Received",
      body: `New order #${order.id.substring(0, 8)} — ₱${total.toFixed(2)}`,
      link: "/dashboard/orders",
    });
    return NextResponse.json({ success: true, data: order, ...(method === "GCASH" ? { nextAction: "INITIALIZE_PAYMENT" } : {}) }, { status: 201 });  } catch (error) { console.error("Order creation error:", error); return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to create order" }, { status: 500 }); }
}
