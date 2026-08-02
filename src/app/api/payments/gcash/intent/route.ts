import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { attachPaymentMethod, createPaymentIntent, getPayMongoConfig } from "@/lib/paymongo";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    const body = await req.json();
    const { orderId, idempotencyKey, paymentMethodId } = body;
    if (!orderId || !idempotencyKey) return NextResponse.json({ success: false, error: "orderId and idempotencyKey are required" }, { status: 400 });
    const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id }, select: { id: true, total: true, paymentStatus: true, paymentIntentId: true, paymentMethodId: true, status: true } });
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    const existing = await prisma.paymentAttempt.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.orderId !== orderId) return NextResponse.json({ success: false, error: "Idempotency key already used" }, { status: 409 });
      return NextResponse.json({ success: true, data: { orderId, paymentIntentId: existing.paymentIntentId, status: existing.status, nextAction: null } });
    }
    if (order.status === "CANCELLED" || order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED") return NextResponse.json({ success: false, error: "Order is not payable" }, { status: 409 });
    if (!paymentMethodId) return NextResponse.json({ success: false, error: "paymentMethodId is required from the PayMongo client-side GCash flow" }, { status: 400 });
    const attempt = await prisma.paymentAttempt.create({ data: { orderId, idempotencyKey, status: "CREATING" } });
    const created = await createPaymentIntent({ amountCentavos: Math.round(order.total * 100), description: `AquaLink PH Order #${order.id.slice(-8)}`, metadata: { order_id: order.id }, idempotencyKey });
    if (!created.ok) { await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED" } }); return NextResponse.json({ success: false, error: created.error.message }, { status: 422 }); }
    const intent = created.data;
    const config = getPayMongoConfig();
    const attached = await attachPaymentMethod(intent.id, { paymentMethodId, returnUrl: `${config.appUrl}/payment/gcash/return?order_id=${encodeURIComponent(order.id)}` });
    if (!attached.ok) { await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { paymentIntentId: intent.id, status: "FAILED" } }); return NextResponse.json({ success: false, error: attached.error.message, paymentIntentId: intent.id }, { status: 422 }); }
    const attrs: any = attached.data.attributes || {};
    const status = attrs.status || "REQUIRES_ACTION";
    const next = attrs.next_action || attrs.nextAction;
    const url = next?.redirect?.url || next?.redirect?.checkout_url || attrs.redirect?.url || attrs.redirect?.checkout_url;
    await prisma.$transaction([
      prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { paymentIntentId: intent.id, status } }),
      prisma.order.update({ where: { id: order.id }, data: { paymentIntentId: intent.id, paymentId: intent.id, paymentMethodId, paymentStatus: status === "succeeded" ? "PAID" : "REQUIRES_ACTION" } }),
    ]);
    return NextResponse.json({ success: true, data: { orderId, paymentIntentId: intent.id, status, nextAction: url ? { type: "redirect", url } : null } });
  } catch (error) { console.error("GCash intent error:", error); return NextResponse.json({ success: false, error: "Payment initialization failed" }, { status: 500 }); }
}
