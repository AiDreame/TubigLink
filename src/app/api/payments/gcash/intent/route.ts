import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  attachPaymentMethod,
  createGcashPaymentMethod,
  createPaymentIntent,
  getPayMongoConfig,
  getPaymentIntent,
} from "@/lib/paymongo";

/**
 * Extract the customer-facing redirect URL (GCash authorization) from a
 * PayMongo PaymentIntent or attach response, tolerating the shapes the
 * provider has returned across API versions.
 */
function extractRedirectUrl(attrs: any): string | null {
  const next = attrs?.next_action || attrs?.nextAction;
  return (
    next?.redirect?.url ||
    next?.redirect?.checkout_url ||
    attrs?.redirect?.url ||
    attrs?.redirect?.checkout_url ||
    null
  );
}

/** Map a raw PayMongo status to the app's paymentStatus vocabulary. */
function mapPaymentStatus(payMongoStatus: string): string {
  const s = String(payMongoStatus || "").toLowerCase();
  if (["succeeded", "paid"].includes(s)) return "PAID";
  if (["failed", "cancelled", "canceled"].includes(s)) return "FAILED";
  return "REQUIRES_ACTION";
}

/**
 * Resolve the GCash PaymentMethod for an order: reuse a known id or create
 * one server-side via the PayMongo client (no client-side JS required).
 */
async function getOrCreateGcashPaymentMethod(
  idempotencyKey: string,
  knownId: string | null,
): Promise<{ paymentMethodId: string } | { error: { message: string; code?: string } }> {
  if (knownId) return { paymentMethodId: knownId };
  const created = await createGcashPaymentMethod({
    idempotencyKey: `gcash-pm:${idempotencyKey}`,
  });
  if (!created.ok) return { error: created.error };
  const data: any = created.data;
  if (typeof data?.id !== "string" || !data.id.startsWith("pm_")) {
    return { error: { message: "PayMongo returned an unexpected payment method" } };
  }
  return { paymentMethodId: data.id };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { orderId, idempotencyKey } = body;
    if (!orderId || !idempotencyKey) {
      return NextResponse.json(
        { success: false, error: "orderId and idempotencyKey are required" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      select: {
        id: true,
        total: true,
        paymentStatus: true,
        paymentIntentId: true,
        paymentMethodId: true,
        status: true,
      },
    });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }
    if (order.status === "CANCELLED" || order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED") {
      return NextResponse.json({ success: false, error: "Order is not payable" }, { status: 409 });
    }

    // Prefer an explicitly supplied PaymentMethod; otherwise reuse the one
    // persisted on the order; otherwise create one server-side.
    let paymentMethodId: string | null = body.paymentMethodId || order.paymentMethodId || null;

    const returnUrl = `${getPayMongoConfig().appUrl}/payment/gcash/return?order_id=${encodeURIComponent(order.id)}`;

    // ── Idempotent retry: the client reuses the same key per order so a
    //    retry never creates a duplicate PaymentIntent. Resume or fail the
    //    existing attempt instead of starting over.
    const existing = await prisma.paymentAttempt.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      if (existing.orderId !== orderId) {
        return NextResponse.json({ success: false, error: "Idempotency key already used" }, { status: 409 });
      }
      if (existing.paymentIntentId) {
        const remote = await getPaymentIntent(existing.paymentIntentId);
        if (remote.ok) {
          const attrs: any = remote.data.attributes || {};
          const rawStatus = String(attrs.status || "").toLowerCase();
          if (["succeeded", "paid"].includes(rawStatus)) {
            await prisma.$transaction([
              prisma.paymentAttempt.update({ where: { id: existing.id }, data: { status: "succeeded" } }),
              prisma.order.update({
                where: { id: order.id },
                data: { paymentStatus: "PAID", paymentPaidAt: new Date() },
              }),
            ]);
            return NextResponse.json({
              success: true,
              data: { orderId, paymentIntentId: existing.paymentIntentId, status: "succeeded", nextAction: null },
            });
          }
          if (["failed", "cancelled", "canceled"].includes(rawStatus)) {
            await prisma.paymentAttempt.update({ where: { id: existing.id }, data: { status: rawStatus } });
            return NextResponse.json({
              success: true,
              data: { orderId, paymentIntentId: existing.paymentIntentId, status: rawStatus, nextAction: null },
            });
          }
          // Still actionable — re-issue the redirect while the provider holds one.
          const url = extractRedirectUrl(attrs);
          if (url) {
            await prisma.paymentAttempt.update({ where: { id: existing.id }, data: { status: rawStatus } });
            return NextResponse.json({
              success: true,
              data: { orderId, paymentIntentId: existing.paymentIntentId, status: rawStatus, nextAction: { type: "redirect", url } },
            });
          }
        }
        // No usable next_action (e.g. awaiting_payment_method): re-attach the
        // payment method to the same intent below so we never double-charge.
        const pmResolved = await getOrCreateGcashPaymentMethod(idempotencyKey, paymentMethodId);
        if ("error" in pmResolved) {
          return NextResponse.json(
            { success: false, error: pmResolved.error.message, code: pmResolved.error.code },
            { status: 422 },
          );
        }
        paymentMethodId = pmResolved.paymentMethodId;
        const reattached = await attachPaymentMethod(existing.paymentIntentId, {
          paymentMethodId,
          returnUrl,
        });
        if (!reattached.ok) {
          await prisma.paymentAttempt.update({ where: { id: existing.id }, data: { status: "FAILED" } });
          return NextResponse.json(
            { success: false, error: reattached.error.message, code: reattached.error.code, paymentIntentId: existing.paymentIntentId },
            { status: 422 },
          );
        }
        const reAttrs: any = reattached.data.attributes || {};
        const reStatus = String(reAttrs.status || "REQUIRES_ACTION").toLowerCase();
        const reUrl = extractRedirectUrl(reAttrs);
        await prisma.$transaction([
          prisma.paymentAttempt.update({ where: { id: existing.id }, data: { status: reStatus } }),
          prisma.order.update({ where: { id: order.id }, data: { paymentStatus: mapPaymentStatus(reStatus) } }),
        ]);
        return NextResponse.json({
          success: true,
          data: {
            orderId,
            paymentIntentId: existing.paymentIntentId,
            status: reStatus,
            nextAction: reUrl ? { type: "redirect", url: reUrl } : null,
          },
        });
      }
      // The attempt never produced a PaymentIntent — safe to retry fresh
      // (PayMongo has no resource for this key, so no duplicate risk).
      await prisma.paymentAttempt.delete({ where: { id: existing.id } });
    }

    // Create the GCash PaymentMethod server-side when the client did not
    // supply one (no PayMongo client-side JS required).
    const pmResolved = await getOrCreateGcashPaymentMethod(idempotencyKey, paymentMethodId);
    if ("error" in pmResolved) {
      return NextResponse.json(
        { success: false, error: pmResolved.error.message, code: pmResolved.error.code },
        { status: 422 },
      );
    }
    paymentMethodId = pmResolved.paymentMethodId;

    const attempt = await prisma.paymentAttempt.create({
      data: { orderId, idempotencyKey, status: "CREATING" },
    });

    const created = await createPaymentIntent({
      amountCentavos: Math.round(order.total * 100),
      description: `AquaLink PH Order #${order.id.slice(-8)}`,
      metadata: { order_id: order.id },
      idempotencyKey,
    });
    if (!created.ok) {
      await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED" } });
      return NextResponse.json(
        { success: false, error: created.error.message, code: created.error.code },
        { status: 422 },
      );
    }
    const intent: any = created.data;
    const intentId = intent?.id;
    if (typeof intentId !== "string" || !intentId.startsWith("pi_")) {
      await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED" } });
      return NextResponse.json(
        { success: false, error: "PayMongo returned an unexpected payment intent" },
        { status: 502 },
      );
    }

    const attached = await attachPaymentMethod(intentId, { paymentMethodId, returnUrl });
    if (!attached.ok) {
      await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { paymentIntentId: intentId, status: "FAILED" } });
      return NextResponse.json(
        { success: false, error: attached.error.message, code: attached.error.code, paymentIntentId: intentId },
        { status: 422 },
      );
    }
    const attrs: any = attached.data.attributes || {};
    const status = String(attrs.status || "REQUIRES_ACTION").toLowerCase();
    const url = extractRedirectUrl(attrs);
    const paymentStatus = mapPaymentStatus(status);

    await prisma.$transaction([
      prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { paymentIntentId: intentId, status } }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          paymentIntentId: intentId,
          paymentId: intentId,
          paymentMethodId,
          paymentStatus,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        paymentIntentId: intentId,
        status,
        nextAction: url ? { type: "redirect", url } : null,
      },
    });
  } catch (error) {
    console.error("GCash intent error:", error);
    return NextResponse.json({ success: false, error: "Payment initialization failed" }, { status: 500 });
  }
}
