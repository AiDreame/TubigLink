import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/dashboard/driver/orders — Returns the logged-in driver's assigned orders
// for today (or a date param). Grouped/sorted by barangay. Filters by status.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffId = (session.user as any).staffId;
    const staffRole = (session.user as any).staffRole;

    if (!staffId) {
      return NextResponse.json(
        { error: "Not a station staff member" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Determine date range (default: today)
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Status filter (default: PENDING, OUT_FOR_DELIVERY)
    const statusParam = searchParams.get("status");
    const statusFilter = statusParam
      ? statusParam.split(",").map((s) => s.trim())
      : ["PENDING", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];

    const orders = await prisma.order.findMany({
      where: {
        driverId: staffId,
        createdAt: { gte: startOfDay, lt: endOfDay },
        status: { in: statusFilter },
      },
      include: {
        items: {
          include: { product: true },
        },
        user: { select: { name: true, phone: true } },
        address: true,
      },
      orderBy: [
        { deliveryOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Group by barangay
    const grouped: Record<string, typeof orders> = {};
    for (const order of orders) {
      const barangay = order.address.barangay || "Unknown";
      if (!grouped[barangay]) grouped[barangay] = [];
      grouped[barangay].push(order);
    }

    // Convert to sorted array by barangay name
    const groupedArray = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([barangay, orders]) => ({
        barangay,
        count: orders.length,
        orders,
      }));

    // Summary stats
    const total = orders.length;
    const completed = orders.filter((o) => o.status === "DELIVERED").length;
    const remaining = total - completed;

    return NextResponse.json({
      success: true,
      data: {
        date: startOfDay.toISOString(),
        summary: { total, completed, remaining },
        grouped: groupedArray,
      },
    });
  } catch (error) {
    console.error("Driver orders fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch driver orders" },
      { status: 500 }
    );
  }
}
