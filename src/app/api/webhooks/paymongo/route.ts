import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { getPayMongoConfig } from "@/lib/paymongo";

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

type JsonRecord = Record<string, any>;

function parseSignature(header: string | null) {
  if (!header) return null;
  const values: Record<string, string> = {};
  for (const part of header.split(",")) {
    const [key, ...rest] = part.trim().split("=");
    if (key && rest.length) values[key] = rest.join("=");
  }
  if (!values.t || !values.v1) return null;
  const timestamp = Number(values.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) return null;
  return { timestamp: values.t, signature: values.v1 };
}

function validSignature(rawBody: string, header: string | null, secret: string) {
  const parsed = parseSignature(header);
  if (!parsed) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${parsed.timestamp}.${rawBody}`).digest("hex");
  const actual = Buffer.from(parsed.signature, "hex");
  const wanted = Buffer.from(expected, "hex");
  return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
}

function eventData(payload: JsonRecord) {
  const root = payload?.data ?? payload;
  const attributes = root?.attributes ?? {};
  const resource = attributes?.data ?? attributes?.payment ?? attributes?.refund ?? root;
  return { root, attributes, resource, resourceAttributes: resource?.attributes ?? {} };
}

function paymentIntentId(resource: JsonRecord, attrs: JsonRecord) {
  return resource?.id || attrs?.payment_intent_id || attrs?.payment_intent?.id || attrs?.payment?.id || undefined;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function processingFee(attributes: JsonRecord) {
  const fees = Array.isArray(attributes?.fees) ? attributes.fees : [];
  if (!fees.length) { console.warn("PayMongo payment has no fees; recording processing fee as zero"); return 0; }
  return fees.reduce((sum: number, fee: JsonRecord) => sum + (typeof fee?.amount === "number" ? fee.amount : 0), 0);
}

export async function POST(request: NextRequest) {
  const secret = getPayMongoConfig().webhookSecret;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get("paymongo-signature"), secret)) {
    console.warn("Rejected PayMongo webhook: invalid signature");
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: JsonRecord;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { root, attributes, resource, resourceAttributes } = eventData(payload);
  const providerEventId = text(root?.id) || text(payload?.id);
  const eventType = text(attributes?.type) || text(payload?.type) || "unknown";
  if (!providerEventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

  let event;
  try {
    event = await prisma.paymentEvent.create({
      data: {
        provider: "PAYMONGO",
        providerEventId,
        eventType,
        paymentIntentId: paymentIntentId(resource, resourceAttributes),
        payload: rawBody,
      },
    });
  } catch (error: any) {
    // The unique provider event key is the replay guard. A duplicate is already durable.
    if (error?.code === "P2002") return NextResponse.json({ received: true });
    console.error("PayMongo webhook persistence error", error);
    return NextResponse.json({ error: "Unable to record webhook" }, { status: 500 });
  }

  const intentId = event.paymentIntentId || paymentIntentId(resource, resourceAttributes);
  const metadata = resourceAttributes?.metadata || attributes?.metadata || {};
  const orderId = text(metadata?.order_id);
  const normalizedType = eventType.toLowerCase();
  const isPaid = normalizedType === "payment.paid";
  const isFailed = normalizedType === "payment.failed";
  const isRefund = normalizedType.includes("refund") || normalizedType === "payment.refunded";
  // Disbursement lifecycle events (Create a Wallet Transaction). `pending` is not
  // an error — InstaPay can take up to 20 minutes — so only the terminal
  // successful/failed events finalize a payout. PayMongo also retries delivery,
  // so updates must be idempotent.
  const isTransferEvent = normalizedType.startsWith("transfer.outward");

  if (isTransferEvent) {
    try {
      await prisma.$transaction(async (tx) => {
        const walletTransactionId = text(resource?.id);
        const referenceNumber = text(resourceAttributes?.reference_number);
        let payout = walletTransactionId
          ? await tx.payout.findFirst({ where: { paymongoTransactionId: walletTransactionId } })
          : null;
        if (!payout && referenceNumber) {
          payout = await tx.payout.findFirst({ where: { paymongoReferenceNumber: referenceNumber } });
        }
        if (!payout) {
          console.warn("PayMongo transfer webhook has no matching payout", {
            providerEventId, walletTransactionId, referenceNumber, eventType,
          });
          await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
          return;
        }
        const succeeded = normalizedType === "transfer.outward.successful" || resourceAttributes.status === "succeeded";
        const providerMessage = text(resourceAttributes.failure_message)
          || text(resourceAttributes.provider_error)
          || text(attributes.message)
          || "PayMongo transfer failed";
        await tx.payout.update({
          where: { id: payout.id },
          data: succeeded
            ? {
                status: "PAID",
                paidAt: payout.paidAt || new Date(),
                paymongoStatus: "succeeded",
                paymongoError: null,
                failureMessage: null,
                transferReference: payout.transferReference || referenceNumber || payout.paymongoReferenceNumber,
              }
            : {
                status: "FAILED",
                failureMessage: providerMessage,
                paymongoStatus: "failed",
                paymongoError: providerMessage,
              },
        });
        if (succeeded) {
          const periodLabel = `${payout.periodStart.toISOString().slice(0, 10)} to ${payout.periodEnd.toISOString().slice(0, 10)}`;
          const payoutBody = `Your payout of ₱${(payout.netCentavos / 100).toFixed(2)} for ${periodLabel} has been paid.`;
          const station = await tx.station.findUnique({ where: { id: payout.stationId }, select: { userId: true } });
          if (station && !(await tx.notification.findFirst({ where: { userId: station.userId, type: "PAYOUT", title: "Payout sent", body: payoutBody } }))) {
            await tx.notification.create({
              data: {
                userId: station.userId,
                type: "PAYOUT",
                title: "Payout sent",
                body: payoutBody,
                link: "/dashboard/earnings",
              },
            });
          }
        }
        await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      });
    } catch (error) {
      console.error("PayMongo transfer webhook processing error", { providerEventId, error });
      await prisma.paymentEvent.update({ where: { id: event.id }, data: { processingError: error instanceof Error ? error.message : "Processing failed" } }).catch(() => undefined);
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  }

  try {
    await prisma.$transaction(async (tx) => {
      let order = orderId ? await tx.order.findUnique({ where: { id: orderId } }) : null;
      if (!order && intentId) order = await tx.order.findUnique({ where: { paymentIntentId: intentId } });
      const refundProviderId = text(resource?.id);
      if (isRefund && refundProviderId) {
        const refund = await tx.refund.findUnique({ where: { providerRefundId: refundProviderId } });
        if (refund) {
          const refundFailed = normalizedType.includes("failed") || resourceAttributes.status === "failed";
          await tx.refund.update({ where: { id: refund.id }, data: refundFailed
            ? { status: "FAILED", failureMessage: text(resourceAttributes.failure_message) || text(resourceAttributes.failure_reason) || text(attributes.message) || "PayMongo refund failed" }
            : { status: "SUCCEEDED", completedAt: new Date(), failureMessage: null } });
          if (!refundFailed) {
            const fullAmount = refund.amountCentavos >= (await tx.order.findUnique({ where: { id: refund.orderId }, select: { amountCentavos: true, total: true } }))?.amountCentavos!;
            const target = await tx.order.findUnique({ where: { id: refund.orderId }, select: { paymentRefundedAmount: true } });
            await tx.order.update({ where: { id: refund.orderId }, data: { ...(fullAmount ? { paymentStatus: "REFUNDED" } : {}), paymentRefundedAt: new Date(), paymentRefundedAmount: (target?.paymentRefundedAmount || 0) + refund.amountCentavos } });
            const dispute = await tx.dispute.findFirst({ where: { refundId: refund.id } });
            if (dispute && dispute.status !== "REFUNDED") await tx.dispute.update({ where: { id: dispute.id }, data: { status: "REFUNDED" } });
          }
          await tx.paymentEvent.update({ where: { id: event.id }, data: { orderId: refund.orderId, processedAt: new Date() } });
          return;
        }
      }
      if (!order) {
        console.warn("PayMongo webhook has no matching order", { providerEventId, orderId, intentId, eventType });
        await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
        return;
      }

      if (isPaid) {
        if (order.amountCentavos != null && typeof resourceAttributes.amount === "number" && order.amountCentavos !== resourceAttributes.amount) {
          console.warn("PayMongo payment amount mismatch", { orderId: order.id, expected: order.amountCentavos, received: resourceAttributes.amount });
        }
        const fee = processingFee(resourceAttributes);
        if (order.paymentStatus !== "PAID" || order.processingFeeCentavos == null) {
          await tx.order.update({ where: { id: order.id }, data: {
            paymentStatus: "PAID", paymentPaidAt: order.paymentPaidAt || new Date(), processingFeeCentavos: fee,
            ...(intentId && !order.paymentIntentId ? { paymentIntentId: intentId } : {}),
          } });
        }
        const paymentLink = `/dashboard/orders/${order.id}`;
        // Station.userId is loaded separately to keep this safe for stations with staff accounts.
        const station = await tx.station.findUnique({ where: { id: order.stationId }, select: { userId: true } });
        if (station && !(await tx.notification.findFirst({ where: { userId: station.userId, type: "SYSTEM", link: paymentLink } }))) {
          await tx.notification.create({ data: { userId: station.userId, type: "SYSTEM", title: "Payment received", body: `Payment received for order #${order.id.substring(0, 8)}.`, link: paymentLink } });
        }
      } else if (isFailed) {
        if (order.paymentStatus !== "PAID") await tx.order.update({ where: { id: order.id }, data: {
          paymentStatus: "FAILED", paymentFailedAt: order.paymentFailedAt || new Date(),
          paymentFailureCode: text(resourceAttributes.failure_code) || text(resourceAttributes.code),
          paymentFailureMessage: text(resourceAttributes.failure_message) || text(resourceAttributes.message) || text(attributes.message),
          ...(intentId && !order.paymentIntentId ? { paymentIntentId: intentId } : {}),
        } });
      } else if (isRefund) {
        if (order.paymentStatus !== "REFUNDED") await tx.order.update({ where: { id: order.id }, data: {
          paymentStatus: "REFUNDED", paymentRefundedAt: order.paymentRefundedAt || new Date(),
          paymentRefundedAmount: typeof resourceAttributes.amount === "number" ? resourceAttributes.amount : order.paymentRefundedAmount,
        } });
        const refundId = text(resource?.id);
        if (refundId) await tx.refund.upsert({ where: { providerRefundId: refundId }, create: { providerRefundId: refundId, orderId: order.id, amountCentavos: typeof resourceAttributes.amount === "number" ? resourceAttributes.amount : (order.amountCentavos || 0), reason: text(resourceAttributes.reason) || "PayMongo webhook", status: "SUCCEEDED", completedAt: new Date() }, update: { status: "SUCCEEDED", completedAt: new Date() } });
        await tx.dispute.updateMany({ where: { orderId: order.id, status: "REFUND_PENDING" }, data: { status: "REFUNDED" } });
      }
      await tx.paymentEvent.update({ where: { id: event.id }, data: { orderId: order.id, processedAt: new Date() } });
    });
  } catch (error) {
    console.error("PayMongo webhook processing error", { providerEventId, error });
    await prisma.paymentEvent.update({ where: { id: event.id }, data: { processingError: error instanceof Error ? error.message : "Processing failed" } }).catch(() => undefined);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
