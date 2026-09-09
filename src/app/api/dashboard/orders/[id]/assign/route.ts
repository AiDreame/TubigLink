import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

// PUT /api/dashboard/orders/[id]/assign — Assign a driver to an order
// Station owner (PROVIDER) or ADMIN role staff only
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const body = await req.json();
    const { driverId } = body;

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { station: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Authorization: station owner, ADMIN user, or ADMIN/MANAGER staff OF THIS
    // STATION. N-04/N-08 (security audit 2026-08-18): staff membership is
    // resolved from the DB scoped to order.stationId — never from JWT claims.
    const isOwner = order.station.userId === userId;
    const isAdmin = userRole === "ADMIN";
    let isStationAdmin = false;
    if (!isOwner && !isAdmin) {
      const staff = await prisma.stationStaff.findFirst({
        where: {
          userId,
          stationId: order.stationId,
          status: "ACTIVE",
          role: { in: ["ADMIN", "MANAGER"] },
        },
        select: { id: true },
      });
      isStationAdmin = !!staff;
    }

    if (!isOwner && !isAdmin && !isStationAdmin) {
      return NextResponse.json(
        { error: "Unauthorized — station owner or admin only" },
        { status: 403 }
      );
    }

    // If driverId is provided (not null/unassign), validate the driver
    if (driverId) {
      const driver = await prisma.stationStaff.findFirst({
        where: {
          id: driverId,
          stationId: order.stationId,
          status: "ACTIVE",
          role: { in: ["STAFF", "DRIVER"] },
        },
      });

      if (!driver) {
        return NextResponse.json(
          { error: "Driver not found or not active in this station" },
          { status: 400 }
        );
      }
    }

    // Determine the next deliveryOrder for this driver
    let deliveryOrder: number | null = null;
    if (driverId) {
      const maxOrder = await prisma.order.findFirst({
        where: { driverId },
        orderBy: { deliveryOrder: "desc" },
        select: { deliveryOrder: true },
      });
      deliveryOrder = (maxOrder?.deliveryOrder ?? 0) + 1;
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        driverId: driverId || null,
        deliveryOrder: driverId ? deliveryOrder : null,
      },
      include: {
        driver: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    void recordAudit({ actor: { id: userId, role: userRole || "PROVIDER" }, action: "order.driver_assign", entityType: "order", entityId: order.id, details: { before: order.driverId, after: updated.driverId, stationId: order.stationId } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Assign driver error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign driver" },
      { status: 500 }
    );
  }
}
