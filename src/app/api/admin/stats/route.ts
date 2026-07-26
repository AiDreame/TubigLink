import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const search = url.searchParams.get("search") || "";
    const statusFilter = url.searchParams.get("status") || "";
    const skip = (page - 1) * limit;

    // ── Aggregate Stats ──
    const [
      totalStations,
      totalUsers,
      totalOrders,
      revenueResult,
      ordersByStatus,
      paymentMethodBreakdown,
      topStations,
      recentOrders,
      revenueByDay,
    ] = await Promise.all([
      // Total stations
      prisma.station.count(),

      // Total users
      prisma.user.count(),

      // Total orders
      prisma.order.count(),

      // Total revenue (sum of total where DELIVERED)
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: "DELIVERED" },
      }),

      // Orders by status breakdown
      prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Payment method breakdown
      prisma.order.groupBy({
        by: ["paymentMethod"],
        _count: { id: true },
        _sum: { total: true },
      }),

      // Top stations by order count
      prisma.station.findMany({
        take: 10,
        orderBy: { orders: { _count: "desc" } },
        include: {
          _count: { select: { orders: true } },
        },
      }),

      // Recent orders (with pagination)
      prisma.order.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        where: {
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(search
            ? {
                OR: [
                  { id: { contains: search } },
                  { user: { name: { contains: search } } },
                ],
              }
            : {}),
        },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          station: { select: { name: true, slug: true, city: true } },
          items: {
            include: {
              product: { select: { name: true, type: true } },
            },
          },
        },
      }),

      // Revenue by day (last 30 days)
      prisma.$queryRawUnsafe<Array<{ date: string; revenue: number; count: number }>>(
        `SELECT DATE(createdAt) as date, SUM(total) as revenue, COUNT(*) as count
         FROM "Order"
         WHERE status = 'DELIVERED' AND createdAt >= datetime('now', '-30 days')
         GROUP BY DATE(createdAt)
         ORDER BY date ASC`
      ),
    ]);

    // Count total matching orders for pagination
    const totalFilteredOrders = search || statusFilter
      ? await prisma.order.count({
          where: {
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(search
              ? {
                  OR: [
                    { id: { contains: search } },
                    { user: { name: { contains: search } } },
                  ],
                }
              : {}),
          },
        })
      : totalOrders;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalStations,
          totalUsers,
          totalOrders,
          totalRevenue: revenueResult._sum.total || 0,
        },
        ordersByStatus: ordersByStatus.map((o) => ({
          status: o.status,
          count: o._count.id,
        })),
        paymentMethodBreakdown: paymentMethodBreakdown.map((p) => ({
          method: p.paymentMethod,
          count: p._count.id,
          total: p._sum.total || 0,
        })),
        topStations: topStations.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          city: s.city,
          orderCount: s._count.orders,
        })),
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          status: o.status,
          total: o.total,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          notes: o.notes,
          createdAt: o.createdAt,
          customer: o.user,
          station: o.station,
          items: o.items.map((i) => ({
            name: i.product.name,
            type: i.product.type,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        })),
        revenueByDay: revenueByDay.map((r) => ({
          date: r.date,
          revenue: Number(r.revenue),
          count: Number(r.count),
        })),
        pagination: {
          page,
          limit,
          total: totalFilteredOrders,
          totalPages: Math.ceil(totalFilteredOrders / limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin stats fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}