import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authorizeDashboardStation, isAuthorizedStation } from "@/lib/station-auth";
import { applyDeliveryAutoConfirmMany } from "@/lib/delivery";

// GET /api/dashboard — Get provider dashboard analytics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await authorizeDashboardStation(searchParams.get("stationId"));
    if (!isAuthorizedStation(access)) return access;
    const { stationId } = access;

    // Date helpers
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get order stats
    const totalOrders = await prisma.order.count({
      where: { stationId },
    });

    const pendingOrders = await prisma.order.count({
      where: { stationId, status: "PENDING" },
    });

    const activeOrders = await prisma.order.count({
      where: {
        stationId,
        status: { in: ["ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY"] },
      },
    });

    const completedOrders = await prisma.order.count({
      where: { stationId, status: "DELIVERED" },
    });

    // Today's orders
    const todayOrders = await prisma.order.count({
      where: { stationId, createdAt: { gte: startOfToday } },
    });

    // Revenue
    const revenue = await prisma.order.aggregate({
      where: { stationId, status: "DELIVERED" },
      _sum: { total: true },
    });

    // Today's revenue
    const todayRevenue = await prisma.order.aggregate({
      where: { stationId, status: "DELIVERED", createdAt: { gte: startOfToday } },
      _sum: { total: true },
    });

    // Recent orders
    const recentOrders = await applyDeliveryAutoConfirmMany(
      await prisma.order.findMany({
        where: { stationId },
        include: {
          items: { include: { product: true } },
          user: { select: { name: true, phone: true } },
          address: true,
          driver: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    );

    // Products with low stock info
    const products = await prisma.product.findMany({
      where: { stationId },
      orderBy: { createdAt: "desc" },
    });

    // Station info
    const station = await prisma.station.findUnique({
      where: { id: stationId },
    });

    // Unique customers count
    const customerIds = await prisma.order.findMany({
      where: { stationId },
      select: { userId: true },
      distinct: ["userId"],
    });

    // Average delivery time (estimated from recent completed orders)
    const completedOrderTimestamps = await prisma.order.findMany({
      where: { stationId, status: "DELIVERED" },
      select: { createdAt: true, updatedAt: true },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    const avgMinutes =
      completedOrderTimestamps.length > 0
        ? Math.round(
            completedOrderTimestamps.reduce((sum, o) => {
              const diff =
                (new Date(o.updatedAt).getTime() -
                  new Date(o.createdAt).getTime()) /
                1000 /
                60;
              return sum + diff;
            }, 0) / completedOrderTimestamps.length
          )
        : 24;

    return NextResponse.json({
      success: true,
      data: {
        station,
        stats: {
          totalOrders,
          pendingOrders,
          activeOrders,
          completedOrders,
          todayOrders,
          todayRevenue: todayRevenue._sum.total || 0,
          totalCustomers: customerIds.length,
          revenue: revenue._sum.total || 0,
          avgDeliveryMinutes: avgMinutes,
        },
        recentOrders,
        products,
      },
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}