import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStationVerificationLabel } from "@/lib/provisional";

// GET /api/admin/verification/[stationId] — Get full verification detail for a station
export async function GET(
  req: NextRequest,
  { params }: { params: { stationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stationId } = params;

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        verificationSteps: {
          orderBy: { timestamp: "desc" },
        },
        verificationLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            performedBy: {
              select: { name: true },
            },
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
            reviews: true,
          },
        },
      },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    // Compute document summary
    const documentSummary = {
      total: station.documents.length,
      pending: station.documents.filter((d) => d.verificationStatus === "PENDING").length,
      verified: station.documents.filter((d) => d.verificationStatus === "VERIFIED").length,
      rejected: station.documents.filter((d) => d.verificationStatus === "REJECTED").length,
      expired: station.documents.filter((d) => d.verificationStatus === "EXPIRED").length,
    };

    // Get verification status label
    const verificationLabel = getStationVerificationLabel(station);

    return NextResponse.json({
      success: true,
      data: {
        ...station,
        documentSummary,
        verificationLabel,
      },
    });
  } catch (error) {
    console.error("Station verification detail error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch station verification detail" },
      { status: 500 }
    );
  }
}
