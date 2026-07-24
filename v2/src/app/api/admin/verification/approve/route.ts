import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/admin/verification/approve — Full approval of a station
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
      include: {
        documents: {
          select: { verificationStatus: true },
        },
      },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    if (station.approvedAt) {
      return NextResponse.json(
        { error: "Station is already fully approved." },
        { status: 400 }
      );
    }

    // Calculate compliance score based on documents
    const totalDocs = station.documents.length;
    const verifiedDocs = station.documents.filter(
      (d) => d.verificationStatus === "VERIFIED"
    ).length;
    const complianceScore =
      totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) / 100 : 0.5;

    // Update station to fully approved
    const updatedStation = await prisma.station.update({
      where: { id: stationId },
      data: {
        onboardingComplete: true,
        approvedAt: new Date(),
        provisionalUntil: null,
        complianceScore,
        isActive: true,
        onboardingStep: 5, // Max step = complete
      },
    });

    // Create verification log entry
    await prisma.verificationLog.create({
      data: {
        stationId,
        action: "STATION_APPROVED",
        performedById: adminId,
        details: JSON.stringify({
          complianceScore,
          verifiedDocs,
          totalDocs,
          approvedAt: new Date().toISOString(),
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
          status: "PASSED",
          verifiedById: adminId,
          notes: "Station fully approved and activated",
          timestamp: new Date(),
        },
      });
    } else {
      await prisma.stationVerification.create({
        data: {
          stationId,
          step: "FINAL_REVIEW",
          status: "PASSED",
          verifiedById: adminId,
          notes: "Station fully approved and activated",
          timestamp: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedStation,
      message: "Station fully approved and activated",
    });
  } catch (error) {
    console.error("Approve station error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to approve station" },
      { status: 500 }
    );
  }
}
