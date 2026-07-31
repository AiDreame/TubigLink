import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// PUT /api/dashboard/driver/orders/reorder — Update delivery sequence
// Accepts { orders: [{ id, deliveryOrder }] }
// Driver or station admin only
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffId = (session.user as any).staffId;
    const staffRole = (session.user as any).staffRole;
    const userRole = (session.user as any).role;

    if (!staffId && userRole !== "PROVIDER" && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Not authorized to reorder deliveries" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orders } = body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: "orders array is required" },
        { status: 400 }
      );
    }

    // Validate all orders exist and are assigned to this driver
    const orderIds = orders.map((o: any) => o.id);

    const existingOrders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, driverId: true },
    });

    const existingIds = new Set(existingOrders.map((o) => o.id));
    for (const oid of orderIds) {
      if (!existingIds.has(oid)) {
        return NextResponse.json(
          { error: `Order ${oid} not found` },
          { status: 404 }
        );
      }
    }

    // If driver, only reorder own orders
    if (staffRole === "DRIVER" || staffRole === "STAFF") {
      for (const o of existingOrders) {
        if (o.driverId !== staffId) {
          return NextResponse.json(
            { error: "Cannot reorder another driver's deliveries" },
            { status: 403 }
          );
        }
      }
    }

    // Update all delivery orders in a transaction
    await prisma.$transaction(
      orders.map((o: { id: string; deliveryOrder: number }) =>
        prisma.order.update({
          where: { id: o.id },
          data: { deliveryOrder: o.deliveryOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reorder deliveries" },
      { status: 500 }
    );
  }
}
