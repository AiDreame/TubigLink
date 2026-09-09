import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

// POST /api/admin/verification/reject — Reject a station with reason
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = session.user.id;
    const body = await req.json();
    const { stationId, rejectionReason } = body;

    if (!stationId) {
      return NextResponse.json({ error: "stationId is required" }, { status: 400 });
    }

    if (!rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const station = await prisma.station.findUnique({
      where: { id: stationId },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    if (station.approvedAt) {
      return NextResponse.json(
        { error: "Station is already fully approved. Cannot reject." },
        { status: 400 }
      );
    }

    // Update station to rejected
    const updatedStation = await prisma.station.update({
      where: { id: stationId },
      data: {
        isActive: false,
        onboardingComplete: false,
        provisionalUntil: null,
        rejectionReason,
        complianceScore: 0,
      },
    });

    // Create verification log entry
    await prisma.verificationLog.create({
      data: {
        stationId,
        action: "STATION_REJECTED",
        performedById: adminId,
        details: JSON.stringify({
          rejectionReason,
        }),
      },
    });

    // Update verification step for final review
    const existingStep = await prisma.stationVerification.findFirst({
      where: { stationId, step: "FINAL_REVIEW" },
    });

    if (existingStep) {
      await prisma.stationVerification.update({
        where: { id: existingStep.id },
        data: {
          status: "FAILED",
          verifiedById: adminId,
          notes: `Rejected: ${rejectionReason}`,
          timestamp: new Date(),
        },
      });
    } else {
      await prisma.stationVerification.create({
        data: {
          stationId,
          step: "FINAL_REVIEW",
          status: "FAILED",
          verifiedById: adminId,
          notes: `Rejected: ${rejectionReason}`,
          timestamp: new Date(),
        },
      });
    }

    void recordAudit({ action: "station.reject", entityType: "station", entityId: stationId, details: { rejectionReason } });
    return NextResponse.json({
      success: true,
      data: updatedStation,
      message: "Station rejected",
    });
  } catch (error) {
    console.error("Reject station error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reject station" },
      { status: 500 }
    );
  }
}
