import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/dashboard/analytics — Rich analytics for station owner
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let stationId = searchParams.get("stationId");

    // If no stationId provided, try to get it from the logged-in user
    if (!stationId) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          { error: "Station ID required or log in as a provider" },
          { status: 401 }
        );
      }

      const userStation = await prisma.station.findFirst({
        where: { userId: (session.user as any).id },
      });

      if (!userStation) {
        return NextResponse.json(
          { error: "No station found for this account" },
          { status: 404 }
        );
      }
      stationId = userStation.id;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const startOfLast30Days = new Date(startOfToday);
    startOfLast30Days.setDate(startOfLast30Days.getDate() - 30);

    // Run all queries in parallel
    const [
      totalOrders,
      allOrders,
      statusGroup,
      last30DaysOrders,
      topProducts,
      hourlyOrders,
      weekdayOrders,
      customerOrderCounts,
      monthOrders,
      monthRevenue,
      lastMonthOrdersCount,
      lastMonthRevenue,
      completedTimes,
      avgOrderValueResult,
    ] = await Promise.all([
      // Total order count
      prisma.order.count({ where: { stationId } }),

      // All orders for customer analysis
      prisma.order.findMany({
        where: { stationId },
        select: { userId: true, total: true, createdAt: true },
      }),

      // Status distribution
      prisma.order.groupBy({
        by: ["status"],
        where: { stationId },
        _count: { id: true },
      }),

      // Last 30 days orders (for ordersByDay)
      prisma.order.findMany({
        where: { stationId, createdAt: { gte: startOfLast30Days } },
        select: { createdAt: true, total: true, status: true },
        orderBy: { createdAt: "asc" },
      }),

      // Top 10 products by quantity ordered
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { stationId } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),

      // Orders by hour of day (all orders)
      prisma.order.findMany({
        where: { stationId },
        select: { createdAt: true },
      }),

      // Orders by day of week (all orders)
      prisma.order.findMany({
        where: { stationId },
        select: { createdAt: true },
      }),

      // Customer order counts (for repeat customer analysis)
      prisma.order.groupBy({
        by: ["userId"],
        where: { stationId },
        _count: { id: true },
      }),

      // This month orders
      prisma.order.aggregate({
        where: { stationId, createdAt: { gte: startOfMonth } },
        _count: { id: true },
        _sum: { total: true },
      }),

      // Last month revenue
      prisma.order.aggregate({
        where: { stationId, createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
        _sum: { total: true },
      }),

      // Last month orders count
      prisma.order.count({
        where: { stationId, createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }),

      // Last month revenue (for monthlyComparison)
      prisma.order.aggregate({
        where: { stationId, status: "DELIVERED", createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
        _sum: { total: true },
      }),

      // Average delivery time
      prisma.order.findMany({
        where: { stationId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),

      // Average order value
      prisma.order.aggregate({
        where: { stationId, status: { not: "CANCELLED" } },
        _avg: { total: true },
      }),
    ]);

    // ── 1. ordersByDay: Last 30 days ──────────────────
    const ordersByDayMap = new Map<string, { count: number; revenue: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split("T")[0];
      ordersByDayMap.set(key, { count: 0, revenue: 0 });
    }
    for (const order of last30DaysOrders) {
      const key = new Date(order.createdAt).toISOString().split("T")[0];
      const existing = ordersByDayMap.get(key);
      if (existing) {
        existing.count++;
        if (order.status === "DELIVERED") existing.revenue += order.total;
      }
    }
    const ordersByDay = Array.from(ordersByDayMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      revenue: data.revenue,
    }));

    // ── 2. popularProducts: Top 10 ────────────────────
    const productIds = topProducts.map((p) => p.productId);
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, price: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const popularProducts = topProducts.map((p) => {
      const product = productMap.get(p.productId);
      const quantity = p._sum.quantity || 0;
      const price = product?.price || 0;
      return {
        name: product?.name || "Unknown",
        quantityOrdered: quantity,
        revenue: quantity * price,
      };
    });

    // ── 3. statusDistribution ──────────────────────────
    const statusDefaults: Record<string, number> = {
      PENDING: 0, ACCEPTED: 0, PREPARING: 0,
      OUT_FOR_DELIVERY: 0, DELIVERED: 0, CANCELLED: 0,
    };
    for (const s of statusGroup) {
      statusDefaults[s.status] = s._count.id;
    }
    const statusDistribution = statusDefaults;

    // ── 4. busiestHours ────────────────────────────────
    const hourBuckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    for (const order of hourlyOrders) {
      const hour = new Date(order.createdAt).getHours();
      hourBuckets[hour].count++;
    }
    const busiestHours = hourBuckets;

    // ── 5. busiestDays ─────────────────────────────────
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayBuckets = dayNames.map((day) => ({ day, count: 0 }));
    for (const order of weekdayOrders) {
      const day = new Date(order.createdAt).getDay();
      dayBuckets[day].count++;
    }
    const busiestDays = dayBuckets;

    // ── 6. repeatCustomers ─────────────────────────────
    const totalCustomers = customerOrderCounts.length;
    const repeatCustomersCount = customerOrderCounts.filter((c) => c._count.id > 1).length;
    const repeatCustomers = {
      total: totalCustomers,
      repeat: repeatCustomersCount,
      percentage: totalCustomers > 0 ? Math.round((repeatCustomersCount / totalCustomers) * 100) : 0,
    };

    // ── 7. avgOrderValue ───────────────────────────────
    const avgOrderValue = avgOrderValueResult._avg?.total
      ? Math.round(avgOrderValueResult._avg.total * 100) / 100
      : 0;

    // ── 8. monthlyComparison ───────────────────────────
    const thisMonthOrders = monthOrders._count.id || 0;
    const thisMonthRevenue = monthOrders._sum.total || 0;
    const monthlyComparison = {
      thisMonth: { orders: thisMonthOrders, revenue: thisMonthRevenue },
      lastMonth: { orders: lastMonthOrdersCount, revenue: lastMonthRevenue._sum.total || 0 },
    };

    // ── Average delivery time ──────────────────────────
    const avgMinutes =
      completedTimes.length > 0
        ? Math.round(
            completedTimes.reduce((sum: number, o: any) => {
              const diff =
                (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) / 1000 / 60;
              return sum + diff;
            }, 0) / completedTimes.length
          )
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        ordersByDay,
        popularProducts,
        statusDistribution,
        busiestHours,
        busiestDays,
        repeatCustomers,
        avgOrderValue,
        avgDeliveryMinutes: avgMinutes,
        totalOrders,
        monthlyComparison,
      },
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}