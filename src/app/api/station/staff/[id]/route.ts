import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ALL_PERMISSIONS } from "@/lib/permissions";

// PUT /api/station/staff/[id] — Update staff permissions or role (owner only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const staffId = params.id;

    // Get the staff record
    const staff = await prisma.stationStaff.findUnique({
      where: { id: staffId },
      include: { station: { select: { userId: true } } },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff record not found" }, { status: 404 });
    }

    // Only the station owner can manage staff
    if (staff.station.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { role, permissions, name, phone, status } = body;

    // Validate role if provided
    if (role && !["STAFF", "MANAGER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be STAFF, MANAGER, or ADMIN" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !["ACTIVE", "SUSPENDED", "DEACTIVATED", "INVITED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be ACTIVE, SUSPENDED, DEACTIVATED, or INVITED" },
        { status: 400 }
      );
    }

    // Validate permissions if provided
    if (permissions) {
      const validKeys = ALL_PERMISSIONS.map((p) => p.key) as string[];
      const invalidKeys = permissions.filter(
        (k: string) => !validKeys.includes(k)
      );
      if (invalidKeys.length > 0) {
        return NextResponse.json(
          { error: `Invalid permission keys: ${invalidKeys.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (permissions) updateData.permissions = JSON.stringify(permissions);
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    const updatedStaff = await prisma.stationStaff.update({
      where: { id: staffId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedStaff,
      message: "Staff updated successfully",
    });
  } catch (error) {
    console.error("Staff update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update staff" },
      { status: 500 }
    );
  }
}

// DELETE /api/station/staff/[id] — Remove/deactivate staff (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const staffId = params.id;

    // Get the staff record
    const staff = await prisma.stationStaff.findUnique({
      where: { id: staffId },
      include: { station: { select: { userId: true } } },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff record not found" }, { status: 404 });
    }

    // Only the station owner can remove staff
    if (staff.station.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Deactivate the staff member (soft delete)
    const updatedStaff = await prisma.stationStaff.update({
      where: { id: staffId },
      data: {
        status: "DEACTIVATED",
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: updatedStaff.id, status: "DEACTIVATED" },
      message: "Staff member removed successfully",
    });
  } catch (error) {
    console.error("Staff delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove staff" },
      { status: 500 }
    );
  }
}