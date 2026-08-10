import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/payments/webhook
 * Handles PayMongo webhook events (source.chargeable, payment.paid, etc.)
 * Updates order paymentStatus when GCash payment is confirmed.
 * Sends notification to the station when payment is confirmed for non-COD orders.
 *
 * For testing: use PayMongo webhook forwarding or ngrok.
 * See: https://developers.paymongo.com/docs/webhooks
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-paymongo-signature");
    const rawBody = await req.text();
    let event;

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventType = event.data?.attributes?.type;
    const resource = event.data?.attributes?.data;

    console.log(`[PayMongo Webhook] Event: ${eventType}`);

    // Helper to notify station on payment confirmation
    const notifyStationOnPayment = async (orderId: string, paymentId: string) => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { stationId: true, total: true, paymentMethod: true },
      });

      if (!order) return;

      const station = await prisma.station.findUnique({
        where: { id: order.stationId },
        select: { userId: true },
      });

      if (!station) return;

      await createNotification({
        userId: station.userId,
        type: "ORDER_NEW",
        title: "New Order Received",
        body: `New order #${orderId.substring(0, 8)} — ₱${order.total.toFixed(2)} (Payment confirmed)`,
        link: "/dashboard/orders",
      });
    }

    // When a source becomes chargeable (GCash payment confirmed)
    if (eventType === "source.chargeable") {
      const sourceId = resource?.id;
      const orderId = resource?.attributes?.metadata?.order_id;

      if (sourceId && orderId) {
        // Update the order with payment ID
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "PAID",
            paymentId: sourceId,
          },
        });

        // Notify the station now that payment is confirmed
        await notifyStationOnPayment(orderId, sourceId);

        console.log(`[PayMongo Webhook] Order ${orderId} marked as PAID via source ${sourceId}`);
      }
    }

    // When a payment is fully paid
    if (eventType === "payment.paid") {
      const paymentId = resource?.id;
      const orderId = resource?.attributes?.metadata?.order_id;

      if (paymentId && orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "PAID",
            paymentId,
          },
        });

        // Notify the station now that payment is confirmed
        await notifyStationOnPayment(orderId, paymentId);

        console.log(`[PayMongo Webhook] Order ${orderId} confirmed PAID via payment ${paymentId}`);
      }
    }

    // When a payment fails
    if (eventType === "payment.failed") {
      const orderId = resource?.attributes?.metadata?.order_id;

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: "FAILED" },
        });

        console.log(`[PayMongo Webhook] Order ${orderId} payment FAILED`);
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PayMongo Webhook] Error:", error);
    // Return 200 so PayMongo doesn't keep retrying
    return NextResponse.json({ success: true });
  }
}