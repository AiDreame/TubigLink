import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/admin/verification/unverify — Revert a verified station back to pending
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

    if (!station.approvedAt) {
      return NextResponse.json(
        { error: "Station is not verified. Nothing to unverify." },
        { status: 400 }
      );
    }

    // Revert station to pending state
    const updatedStation = await prisma.station.update({
      where: { id: stationId },
      data: {
        approvedAt: null,
        isActive: false,
        onboardingComplete: false,
        rejectionReason: null,
        provisionalUntil: null,
        complianceScore: 0,
        onboardingStep: Math.max(1, station.onboardingStep - 1), // Move back one step
      },
    });

    // Create verification log entry
    await prisma.verificationLog.create({
      data: {
        stationId,
        action: "STATION_REJECTED",
        performedById: adminId,
        details: JSON.stringify({
          previousStatus: "VERIFIED",
          newStatus: "UNVERIFIED",
          reason: "Station verification reverted by admin",
          unverifiedAt: new Date().toISOString(),
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
          status: "PENDING",
          verifiedById: adminId,
          notes: "Verification reverted by admin — station moved back to pending review",
          timestamp: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedStation,
      message: "Station verification has been reverted to pending",
    });
  } catch (error) {
    console.error("Unverify station error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unverify station" },
      { status: 500 }
    );
  }
}
