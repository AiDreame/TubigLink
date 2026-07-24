import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/reviews — Create a review for an order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, stationId, orderId, rating, comment } = body;

    if (!userId || !stationId || !orderId || !rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if order exists and is delivered
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "DELIVERED") {
      return NextResponse.json(
        { error: "Can only review delivered orders" },
        { status: 400 }
      );
    }

    // Check if already reviewed
    const existingReview = await prisma.review.findUnique({
      where: { orderId },
    });
    if (existingReview) {
      return NextResponse.json(
        { error: "Order already reviewed" },
        { status: 409 }
      );
    }

    const review = await prisma.review.create({
      data: { userId, stationId, orderId, rating, comment },
      include: {
        user: { select: { name: true, avatar: true } },
      },
    });

    // Update station's average rating
    const stats = await prisma.review.aggregate({
      where: { stationId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.station.update({
      where: { id: stationId },
      data: {
        rating: stats._avg.rating || 0,
        totalReviews: stats._count,
      },
    });

    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error) {
    console.error("Review creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create review" },
      { status: 500 }
    );
  }
}