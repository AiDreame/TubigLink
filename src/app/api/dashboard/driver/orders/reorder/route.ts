import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

// PUT /api/dashboard/driver/orders/reorder — Update delivery sequence
// Accepts { orders: [{ id, deliveryOrder }] }
// Driver or station admin only
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const body = await req.json();
    const { orders } = body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: "orders array is required" },
        { status: 400 }
      );
    }

    // Validate all orders exist
    const orderIds = orders.map((o: any) => o.id);

    const existingOrders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, driverId: true, stationId: true },
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

    // N-05/N-08 (security audit 2026-08-18): the caller's station scope is
    // resolved from the DB — never from JWT claims — and every order must
    // belong to it (mirrors how the DRIVER/STAFF path is scoped by driverId).
    if (userRole === "ADMIN") {
      // Platform admin may reorder any station's deliveries.
    } else if (userRole === "PROVIDER") {
      const owned = await prisma.station.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json(
          { error: "No station found for this account" },
          { status: 403 }
        );
      }
      for (const o of existingOrders) {
        if (o.stationId !== owned.id) {
          return NextResponse.json(
            { error: "Cannot reorder orders from another station" },
            { status: 403 }
          );
        }
      }
    } else {
      // STAFF or DRIVER role — resolve the active staff row from the DB.
      const staff = await prisma.stationStaff.findFirst({
        where: { userId, status: "ACTIVE" },
        select: { id: true, stationId: true, role: true },
      });
      if (!staff) {
        return NextResponse.json(
          { error: "Not authorized to reorder deliveries" },
          { status: 403 }
        );
      }
      // Drivers/staff may only reorder deliveries assigned to them.
      if (staff.role === "DRIVER" || staff.role === "STAFF") {
        for (const o of existingOrders) {
          if (o.driverId !== staff.id) {
            return NextResponse.json(
              { error: "Cannot reorder another driver's deliveries" },
              { status: 403 }
            );
          }
        }
      } else {
        // MANAGER/ADMIN staff — scoped to their own station.
        for (const o of existingOrders) {
          if (o.stationId !== staff.stationId) {
            return NextResponse.json(
              { error: "Cannot reorder orders from another station" },
              { status: 403 }
            );
          }
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

    void recordAudit({ actor: { id: userId, role: userRole || "PROVIDER" }, action: "order.delivery_reorder", entityType: "order", entityId: orderIds[0], details: { orderIds, count: orderIds.length } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reorder deliveries" },
      { status: 500 }
    );
  }
}
