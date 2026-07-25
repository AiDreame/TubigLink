import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/station/staff/invite/[token] — Validate an invite token
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const staff = await prisma.stationStaff.findUnique({
      where: { inviteToken: token },
      include: {
        station: {
          select: { name: true, logo: true, barangay: true, city: true },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 404 }
      );
    }

    if (staff.status !== "INVITED") {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        email: staff.email,
        name: staff.name,
        role: staff.role,
        stationName: staff.station.name,
        stationLogo: staff.station.logo,
        stationLocation: `${staff.station.barangay}, ${staff.station.city}`,
        status: staff.status,
      },
    });
  } catch (error) {
    console.error("Invite validation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate invitation" },
      { status: 500 }
    );
  }
}