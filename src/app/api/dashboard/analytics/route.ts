import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authorizeDashboardStation, isAuthorizedStation } from "@/lib/station-auth";
import { format } from "date-fns";

// GET /api/dashboard/analytics — Rich analytics for station owner
// Optional query params:
//   days=7|30|90       — date range for ordersByDay (default: 30)
//   fields=ordersByDay  — lightweight response with only ordersByDay
//   from=YYYY-MM-DD&to=YYYY-MM-DD — custom inclusive date range (local time).
//     Overrides `days`. All metrics are recomputed against [from 00:00, to 23:59:59]
//     and the comparison block compares the range against the immediately
//     preceding equal-length window. Validation: both or neither, valid ISO dates,
//     from <= to, at most 366 days.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Strictly parse YYYY-MM-DD into a local-time Date (rejects rollovers like 2026-02-31). */
function parseISODate(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** Local-timezone YYYY-MM-DD key (no UTC shift, matches the [00:00, 23:59:59] local filter). */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Human label for an inclusive day range, e.g. "Jul 1–31, 2026" or "Dec 30, 2025 – Jan 3, 2026". */
function formatRangeLabel(start: Date, end: Date): string {
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${format(start, "MMM")} ${format(start, "d")}–${format(end, "d")}, ${end.getFullYear()}`;
  if (sameYear) return `${format(start, "MMM d")} – ${format(end, "MMM d")}, ${end.getFullYear()}`;
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

interface DayDatum {
  date: string;
  count: number;
  revenue: number;
}

/** Bucket orders into zero-filled daily buckets starting at `start` for `numDays` days. */
function buildOrdersByDay(
  start: Date,
  numDays: number,
  orders: { createdAt: Date; total: number }[],
  keyFn: (d: Date) => string
): DayDatum[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    map.set(keyFn(d), { count: 0, revenue: 0 });
  }
  for (const order of orders) {
    const key = keyFn(new Date(order.createdAt));
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      existing.revenue += order.total || 0;
    }
  }
  return Array.from(map.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    revenue: Math.round(data.revenue * 100) / 100,
  }));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let stationId = searchParams.get("stationId");
    const rawDays = searchParams.get("days");
    const fields = searchParams.get("fields");
    const rawFrom = searchParams.get("from");
    const rawTo = searchParams.get("to");

    // Validate days param — exact string match to prevent parseInt leniency
    let days = 30;
    if (rawDays !== null) {
      if (!["7", "30", "90"].includes(rawDays)) {
        return NextResponse.json(
          { error: "Invalid days parameter. Must be 7, 30, or 90." },
          { status: 400 }
        );
      }
      days = parseInt(rawDays, 10);
    }

    // ── Custom date range validation ──────────────────
    const custom = rawFrom !== null || rawTo !== null;
    let fromStart: Date | undefined;
    let toEndExclusive: Date | undefined; // first instant AFTER the selected range
    let prevStart: Date | undefined; // start of the equal-length preceding window
    let rangeDays = 0;

    if (custom) {
      if (rawFrom === null || rawTo === null) {
        return NextResponse.json(
          { error: "Both 'from' and 'to' query params are required (YYYY-MM-DD)." },
          { status: 400 }
        );
      }
      const parsedFrom = parseISODate(rawFrom);
      if (!parsedFrom) {
        return NextResponse.json(
          { error: "Invalid 'from' date. Expected YYYY-MM-DD." },
          { status: 400 }
        );
      }
      const parsedTo = parseISODate(rawTo);
      if (!parsedTo) {
        return NextResponse.json(
          { error: "Invalid 'to' date. Expected YYYY-MM-DD." },
          { status: 400 }
        );
      }
      fromStart = new Date(parsedFrom.getFullYear(), parsedFrom.getMonth(), parsedFrom.getDate());
      toEndExclusive = new Date(parsedTo.getFullYear(), parsedTo.getMonth(), parsedTo.getDate() + 1);
      if (fromStart.getTime() >= toEndExclusive.getTime()) {
        return NextResponse.json(
          { error: "'from' date must not be after 'to' date." },
          { status: 400 }
        );
      }
      rangeDays = Math.round((toEndExclusive.getTime() - fromStart.getTime()) / 86400000);
      if (rangeDays > 366) {
        return NextResponse.json(
          { error: "Date range must be at most 366 days." },
          { status: 400 }
        );
      }
      prevStart = new Date(fromStart);
      prevStart.setDate(prevStart.getDate() - rangeDays);
    }

    const access = await authorizeDashboardStation(stationId);
    if (!isAuthorizedStation(access)) return access;
    stationId = access.stationId;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Where clause for the selected window (custom) or all orders (default view)
    const windowWhere = custom
      ? { stationId, createdAt: { gte: fromStart!, lt: toEndExclusive! } }
      : { stationId };

    // Dynamic range start (default view)
    const rangeStart = new Date(startOfToday);
    rangeStart.setDate(rangeStart.getDate() - days + 1);

    // Fetch orders for the chart window
    const rangeOrders = await prisma.order.findMany({
      where: custom
        ? { stationId, createdAt: { gte: fromStart!, lt: toEndExclusive! } }
        : { stationId, createdAt: { gte: rangeStart } },
      select: { createdAt: true, status: true, total: true },
      orderBy: { createdAt: "asc" },
    });

    // Build ordersByDay with zero-fill for inclusive daily buckets
    const ordersByDay = custom
      ? buildOrdersByDay(fromStart!, rangeDays, rangeOrders, localDateKey)
      : buildOrdersByDay(rangeStart, days, rangeOrders, (d) => d.toISOString().split("T")[0]);

    // Lightweight response for overview graph
    if (fields === "ordersByDay") {
      return NextResponse.json({
        success: true,
        data: { ordersByDay },
      });
    }

    // ── Full response (backward-compatible) ────────────
    // For the default (non-custom) full analytics, always use 30-day ordersByDay for chart consistency
    const startOfLast30Days = new Date(startOfToday);
    startOfLast30Days.setDate(startOfLast30Days.getDate() - 30);

    const last30DaysOrders =
      !custom && days === 30
        ? rangeOrders
        : await prisma.order.findMany({
            where: custom
              ? { stationId, createdAt: { gte: fromStart!, lt: toEndExclusive! } }
              : { stationId, createdAt: { gte: startOfLast30Days } },
            select: { createdAt: true, status: true, total: true },
            orderBy: { createdAt: "asc" },
          });

    // Run all queries in parallel
    const [
      totalOrders,
      allOrders,
      statusGroup,
      topProducts,
      hourlyOrders,
      weekdayOrders,
      customerOrderCounts,
      monthOrders,
      lastMonthOrdersCount,
      lastMonthRevenue,
      completedTimes,
      avgOrderValueResult,
    ] = await Promise.all([
      prisma.order.count({ where: windowWhere }),

      prisma.order.findMany({
        where: windowWhere,
        select: { userId: true, total: true, createdAt: true },
      }),

      prisma.order.groupBy({
        by: ["status"],
        where: windowWhere,
        _count: { id: true },
      }),

      prisma.orderItem.groupBy({
        by: ["productId"],
        where: custom
          ? { order: { stationId, createdAt: { gte: fromStart!, lt: toEndExclusive! } } }
          : { order: { stationId } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),

      prisma.order.findMany({
        where: windowWhere,
        select: { createdAt: true },
      }),

      prisma.order.findMany({
        where: windowWhere,
        select: { createdAt: true },
      }),

      prisma.order.groupBy({
        by: ["userId"],
        where: windowWhere,
        _count: { id: true },
      }),

      custom
        ? prisma.order.aggregate({
            where: windowWhere,
            _count: { id: true },
            _sum: { total: true },
          })
        : prisma.order.aggregate({
            where: { stationId, createdAt: { gte: startOfMonth } },
            _count: { id: true },
            _sum: { total: true },
          }),

      custom
        ? prisma.order.count({
            where: { stationId, createdAt: { gte: prevStart!, lt: fromStart! } },
          })
        : prisma.order.count({
            where: { stationId, createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
          }),

      custom
        ? prisma.order.aggregate({
            where: { stationId, createdAt: { gte: prevStart!, lt: fromStart! } },
            _sum: { total: true },
          })
        : prisma.order.aggregate({
            where: { stationId, status: "DELIVERED", createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
            _sum: { total: true },
          }),

      prisma.order.findMany({
        where: custom
          ? { stationId, status: "DELIVERED", createdAt: { gte: fromStart!, lt: toEndExclusive! } }
          : { stationId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),

      prisma.order.aggregate({
        where: custom
          ? { stationId, status: { not: "CANCELLED" }, createdAt: { gte: fromStart!, lt: toEndExclusive! } }
          : { stationId, status: { not: "CANCELLED" } },
        _avg: { total: true },
      }),
    ]);

    // ── Build ordersByDay for the full response ────────
    // Custom range: the range buckets ARE the chart. Default: 30-day buckets for chart consistency.
    let fullOrdersByDay: DayDatum[];
    if (custom) {
      fullOrdersByDay = ordersByDay;
    } else if (days === 30) {
      fullOrdersByDay = ordersByDay;
    } else {
      const fullMap = new Map<string, { count: number; revenue: number }>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - (29 - i));
        const key = d.toISOString().split("T")[0];
        fullMap.set(key, { count: 0, revenue: 0 });
      }
      for (const order of last30DaysOrders) {
        const key = new Date(order.createdAt).toISOString().split("T")[0];
        const existing = fullMap.get(key);
        if (existing) {
          existing.count++;
          existing.revenue += order.total || 0;
          }
      }
      fullOrdersByDay = Array.from(fullMap.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        revenue: Math.round(data.revenue * 100) / 100,
        }));
    }

    // ── popularProducts ──────────────────────────────
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
        revenue: Math.round(quantity * price * 100) / 100,
      };
    });

    // ── statusDistribution ──────────────────────────
    const statusDefaults: Record<string, number> = {
      PENDING: 0, ACCEPTED: 0, PREPARING: 0,
      OUT_FOR_DELIVERY: 0, DELIVERED: 0, CANCELLED: 0,
    };
    for (const s of statusGroup) {
      statusDefaults[s.status] = s._count.id;
    }
    const statusDistribution = statusDefaults;

    // ── busiestHours ────────────────────────────────
    const hourBuckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    for (const order of hourlyOrders) {
      const hour = new Date(order.createdAt).getHours();
      hourBuckets[hour].count++;
    }
    const busiestHours = hourBuckets;

    // ── busiestDays ─────────────────────────────────
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayBuckets = dayNames.map((day) => ({ day, count: 0 }));
    for (const order of weekdayOrders) {
      const day = new Date(order.createdAt).getDay();
      dayBuckets[day].count++;
    }
    const busiestDays = dayBuckets;

    // ── repeatCustomers ─────────────────────────────
    const totalCustomers = customerOrderCounts.length;
    const repeatCustomersCount = customerOrderCounts.filter((c) => c._count.id > 1).length;
    const repeatCustomers = {
      total: totalCustomers,
      repeat: repeatCustomersCount,
      percentage: totalCustomers > 0 ? Math.round((repeatCustomersCount / totalCustomers) * 100) : 0,
    };

    // ── avgOrderValue ───────────────────────────────
    const avgOrderValue = avgOrderValueResult._avg?.total
      ? Math.round(avgOrderValueResult._avg.total * 100) / 100
      : 0;

    // ── Comparison block ─────────────────────────────
    // Custom range: selected window vs the immediately preceding equal-length window.
    // Default view: this month vs last month (existing behavior preserved).
    let monthlyComparison: {
      thisMonth: { orders: number; revenue: number };
      lastMonth: { orders: number; revenue: number };
    };
    let range: { from: string; to: string; days: number } | null = null;
    let comparison: {
      custom: boolean;
      thisLabel: string;
      lastLabel: string;
      title: string;
    };

    if (custom) {
      monthlyComparison = {
        thisMonth: { orders: monthOrders._count.id || 0, revenue: monthOrders._sum?.total || 0 },
        lastMonth: { orders: lastMonthOrdersCount, revenue: lastMonthRevenue._sum?.total || 0 },
      };
      const thisEnd = new Date(toEndExclusive!.getTime() - 86400000);
      const lastEnd = new Date(fromStart!.getTime() - 86400000);
      const thisLabel = formatRangeLabel(fromStart!, thisEnd);
      const lastLabel = formatRangeLabel(prevStart!, lastEnd);
      range = { from: rawFrom!, to: rawTo!, days: rangeDays };
      comparison = {
        custom: true,
        thisLabel,
        lastLabel,
        title: `${thisLabel} vs ${lastLabel}`,
      };
    } else {
      const thisMonthOrders = monthOrders._count.id || 0;
      monthlyComparison = {
        thisMonth: { orders: thisMonthOrders, revenue: monthOrders._sum?.total || 0 },
        lastMonth: { orders: lastMonthOrdersCount, revenue: lastMonthRevenue._sum?.total || 0 },
      };
      comparison = {
        custom: false,
        thisLabel: "This Month",
        lastLabel: "Last Month",
        title: "Monthly Comparison",
      };
    }

    // ── Average delivery time ────────────────────────
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
        ordersByDay: fullOrdersByDay,
        popularProducts,
        statusDistribution,
        busiestHours,
        busiestDays,
        repeatCustomers,
        avgDeliveryMinutes: avgMinutes,
        avgOrderValue,
        totalOrders,
        monthlyComparison,
        // New fields (backward-compatible additions)
        range,
        comparison,
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
