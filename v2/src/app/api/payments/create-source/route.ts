import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/payments/create-source
 * Creates a PayMongo Source for GCash payment.
 * Returns the checkout_url the customer needs to visit.
 *
 * Requires: PAYMONGO_SECRET_KEY and PAYMONGO_PUBLIC_KEY in env.
 * See: https://developers.paymongo.com/v1/reference#create-a-source
 */
export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: "PayMongo not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { amount, orderId, description = "AquaLink PH Water Delivery" } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // PayMongo uses centavo format (PHP amount * 100)
    const amountCentavos = Math.round(amount * 100);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const payload = {
      data: {
        attributes: {
          type: "gcash",
          amount: amountCentavos,
          currency: "PHP",
          redirect: {
            success: `${appUrl}/payment/success?order_id=${orderId}`,
            failed: `${appUrl}/payment/cancel?order_id=${orderId}`,
          },
          description,
          metadata: {
            order_id: orderId,
          },
        },
      },
    };

    const res = await fetch("https://api.paymongo.com/v1/sources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("PayMongo error:", JSON.stringify(data));
      return NextResponse.json(
        { success: false, error: data.errors?.[0]?.detail || "Payment source creation failed" },
        { status: 422 }
      );
    }

    const source = data.data;
    return NextResponse.json({
      success: true,
      data: {
        id: source.id,
        type: source.attributes.type,
        amount: source.attributes.amount,
        status: source.attributes.status,
        redirect: source.attributes.redirect,
        checkout_url: source.attributes.redirect?.checkout_url,
      },
    });
  } catch (error) {
    console.error("PayMongo create-source error:", error);
    return NextResponse.json(
      { success: false, error: "Payment initialization failed" },
      { status: 500 }
    );
  }
}