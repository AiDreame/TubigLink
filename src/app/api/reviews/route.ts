import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { reviewDisplayName } from "@/lib/review-display";
import { recordAudit } from "@/lib/audit";

// GET /api/reviews?stationId={id} — List reviews for a station.
// PUBLIC endpoint. N-09: reviewer identities are mapped to display-safe first
// names ("Juan") with a "Verified Customer" fallback — full personal names
// never leave this API. DB rows are untouched.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get("stationId");

    if (!stationId) {
      return NextResponse.json(
        { error: "stationId query parameter is required" },
        { status: 400 }
      );
    }

    const reviews = await prisma.review.findMany({
      where: { stationId },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = reviews.map((r: any) => ({
      ...r,
      user: {
        name: reviewDisplayName(r.user?.name ?? null),
      },
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Review fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST /api/reviews — Create a review for an order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authenticatedUserId = (session?.user as any)?.id;
    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // S-05 (security audit 2026-08-14): per-user cap on review creation — 10 /
    // hour (token bucket). Review spam would poison station ratings.
    const rl = rateLimit(`review-create:${authenticatedUserId}`, 10, 60 * 60 * 1000);
    if (!rl.ok) {
      return tooManyRequests(
        "You've posted too many reviews recently. Please try again later.",
        rl.retryAfterSec
      );
    }

    const body = await req.json();
    const { orderId, rating, comment } = body;

    if (!orderId || rating === undefined || rating === null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    // Derive ownership and station from the authoritative order record.
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "DELIVERED" || order.userId !== authenticatedUserId) {
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
      data: { userId: authenticatedUserId, stationId: order.stationId, orderId, rating, comment },
      include: {
        user: { select: { name: true, avatar: true } },
      },
    });

    // Update station's average rating
    const stationId = order.stationId;
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

    // Notify the station owner about the new review
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { userId: true, slug: true },
    });
    if (station) {
      await createNotification({
        userId: station.userId,
        type: "SYSTEM",
        title: "New Review Received",
        body: `${rating}★ review on your station`,
        link: `/stations/${station.slug}`,
      });
    }

    void recordAudit({ actor: { id: authenticatedUserId, role: "CUSTOMER" }, action: "review.create", entityType: "review", entityId: review.id, details: { stationId: order.stationId, orderId, rating } });
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error) {
    console.error("Review creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create review" },
      { status: 500 }
    );
  }
}