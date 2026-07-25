import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PROVISIONAL_DURATION_DAYS, PROVISIONAL_COMPLIANCE_SCORE } from "@/lib/provisional";

// POST /api/admin/verification/provisional — Grant provisional access to a station
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = session.user.id;
    const body = await req.json();
    const { stationId } = body;

    if (!stationId) {
      return NextResponse.json({ error: "stationId is required" }, { status: 400 });
    }

    const station = await prisma.station.findUnique({
      where: { id: stationId },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    if (station.approvedAt) {
      return NextResponse.json(
        { error: "Station is already fully approved. Cannot grant provisional access." },
        { status: 400 }
      );
    }

    // Calculate provisional expiry date (30 days from now)
    const provisionalUntil = new Date();
    provisionalUntil.setDate(provisionalUntil.getDate() + PROVISIONAL_DURATION_DAYS);

    // Update station to provisional mode
    const updatedStation = await prisma.station.update({
      where: { id: stationId },
      data: {
        isActive: true,
        onboardingComplete: false,
        provisionalUntil,
        complianceScore: PROVISIONAL_COMPLIANCE_SCORE,
        rejectionReason: null,
      },
    });

    // Create verification log entry
    await prisma.verificationLog.create({
      data: {
        stationId,
        action: "PROVISIONAL_GRANTED",
        performedById: adminId,
        details: JSON.stringify({
          provisionalUntil: provisionalUntil.toISOString(),
          durationDays: PROVISIONAL_DURATION_DAYS,
        }),
      },
    });

    // Create verification step record
    await prisma.stationVerification.create({
      data: {
        stationId,
        step: "PROVISIONAL_ACCESS",
        status: "PASSED",
        verifiedById: adminId,
        notes: `Granted provisional access until ${provisionalUntil.toLocaleDateString()}`,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedStation,
      message: `Provisional access granted until ${provisionalUntil.toLocaleDateString()}`,
    });
  } catch (error) {
    console.error("Grant provisional error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to grant provisional access" },
      { status: 500 }
    );
  }
}
