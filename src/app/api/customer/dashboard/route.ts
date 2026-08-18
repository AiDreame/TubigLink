import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyDeliveryAutoConfirmMany } from "@/lib/delivery";

// GET /api/customer/dashboard — Aggregated customer dashboard data
export async function GET(req: NextRequest) {
  try {
    // N-01 (security audit 2026-08-18): the acting userId is ALWAYS derived
    // from the session. Any `?userId=` query param is ignored (callers
    // src/app/my/page.tsx and src/components/customer/Dashboard.tsx already
    // pass the session id, so the param is a harmless no-op).
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    const userId = sessionUser?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required. Please log in." },
        { status: 401 }
      );
    }

    // Active orders (not yet delivered or cancelled)
    const activeOrders = await prisma.order.findMany({
      where: {
        userId,
        status: { in: ["PENDING", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY"] },
      },
      include: {
        items: { include: { product: true } },
        station: { select: { id: true, name: true, slug: true, logo: true } },
        address: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Recent order history (last 10 completed/cancelled)
    const recentOrders = await applyDeliveryAutoConfirmMany(
      await prisma.order.findMany({
        where: {
          userId,
          status: { in: ["DELIVERED", "CANCELLED"] },
        },
        include: {
          items: { include: { product: true } },
          station: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    );

    // Upcoming scheduled deliveries
    const upcomingScheduled = await prisma.order.findMany({
      where: {
        userId,
        orderType: "RECURRING",
        status: { not: "CANCELLED" },
      },
      include: {
        items: { include: { product: true } },
        station: { select: { id: true, name: true, slug: true } },
        address: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Saved addresses count
    const addressesCount = await prisma.address.count({
      where: { userId },
    });

    // Saved payment methods count
    const paymentMethodsCount = await prisma.paymentMethod.count({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      data: {
        activeOrders,
        recentOrders,
        upcomingScheduled,
        stats: {
          activeOrdersCount: activeOrders.length,
          addressesCount,
          paymentMethodsCount,
          scheduledCount: upcomingScheduled.length,
        },
      },
    });
  } catch (error) {
    console.error("Customer dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}