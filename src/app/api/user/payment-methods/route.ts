import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/user/payment-methods — List saved payment methods
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const methods = await prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    // Parse details JSON for each method
    const parsed = methods.map((m) => ({
      ...m,
      details: JSON.parse(m.details),
    }));

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Payment methods fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

// POST /api/user/payment-methods — Add a new payment method
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, details } = body;

    if (!userId || !type || !details) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (userId, type, details)" },
        { status: 400 }
      );
    }

    const validTypes = ["GCASH", "CARD", "PAYMAYA"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type. Must be one of: GCASH, CARD, PAYMAYA" },
        { status: 400 }
      );
    }

    // Check if this type already exists for this user
    const existing = await prisma.paymentMethod.findUnique({
      where: { userId_type: { userId, type } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `A ${type} payment method is already saved for this user` },
        { status: 409 }
      );
    }

    // If this is the first method, make it default
    const count = await prisma.paymentMethod.count({ where: { userId } });
    const isDefault = count === 0 ? true : (body.isDefault === true);

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const method = await prisma.paymentMethod.create({
      data: {
        userId,
        type,
        details: JSON.stringify(details),
        isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...method, details: method.details },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Payment method creation error:", error);
    // Handle unique constraint violation
    if (error?.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "This payment method is already saved" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to add payment method" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/payment-methods?id=X — Remove a payment method
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Payment method ID is required" },
        { status: 400 }
      );
    }

    const method = await prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!method) {
      return NextResponse.json(
        { success: false, error: "Payment method not found" },
        { status: 404 }
      );
    }

    // If deleting the default, assign default to the next available method
    if (method.isDefault) {
      const nextMethod = await prisma.paymentMethod.findFirst({
        where: { userId: method.userId, id: { not: id } },
        orderBy: { createdAt: "desc" },
      });
      if (nextMethod) {
        await prisma.paymentMethod.update({
          where: { id: nextMethod.id },
          data: { isDefault: true },
        });
      }
    }

    await prisma.paymentMethod.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Payment method removed",
    });
  } catch (error) {
    console.error("Payment method deletion error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove payment method" },
      { status: 500 }
    );
  }
}