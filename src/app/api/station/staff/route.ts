import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/station/staff — List all staff for the owner's station
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the user's station
    const station = await prisma.station.findFirst({
      where: { userId },
    });

    if (!station) {
      return NextResponse.json(
        { error: "No station found for this user" },
        { status: 404 }
      );
    }

    // Parse query params for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // Build filter
    const where: any = { stationId: station.id };
    if (status && ["INVITED", "ACTIVE", "DEACTIVATED"].includes(status)) {
      where.status = status;
    }

    const staff = await prisma.stationStaff.findMany({
      where,
      include: {
        invitedBy: {
          select: { name: true, email: true },
        },
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Parse permissions for each staff member
    const staffWithPermissions = staff.map((member) => {
      let permissions: string[] = [];
      try {
        permissions = JSON.parse(member.permissions);
      } catch {
        permissions = [];
      }
      return {
        ...member,
        permissionList: permissions,
        permissionsCount: permissions.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: staffWithPermissions,
      total: staff.length,
    });
  } catch (error) {
    console.error("Staff list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch staff list" },
      { status: 500 }
    );
  }
}