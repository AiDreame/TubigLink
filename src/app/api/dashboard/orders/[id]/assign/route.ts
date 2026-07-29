import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    const staffRole = (session.user as any).staffRole;

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

    // Authorization: station owner, ADMIN user, or ADMIN/MANAGER staff
    const isOwner = order.station.userId === userId;
    const isAdmin = userRole === "ADMIN";
    const isStationAdmin = staffRole === "ADMIN" || staffRole === "MANAGER";

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

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Assign driver error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign driver" },
      { status: 500 }
    );
  }
}
