import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/station/documents — List documents for the authenticated user's station
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
    const type = searchParams.get("type");
    const verificationStatus = searchParams.get("verificationStatus");

    // Build filter
    const where: any = { stationId: station.id };
    if (type && [
      "BUSINESS_REGISTRATION", "DTI_CERT", "SEC_CERT", "BIR_2303", "MAYORS_PERMIT",
      "BARANGAY_CLEARANCE", "SANITARY_PERMIT", "WATER_TEST_BACTERIOLOGICAL",
      "WATER_TEST_PHYSICAL_CHEMICAL", "GOVT_ID", "FIRE_SAFETY_CERT",
      "PROOF_OF_ADDRESS", "STATION_PHOTO", "VIDEO_WALKTHROUGH",
    ].includes(type)) {
      // Normalize legacy types to BUSINESS_REGISTRATION for backward compatibility
      if (type === "DTI_CERT" || type === "SEC_CERT") {
        where.type = { in: ["DTI_CERT", "SEC_CERT", "BUSINESS_REGISTRATION"] };
      } else {
        where.type = type;
      }
    }
    if (verificationStatus && ["PENDING", "VERIFIED", "REJECTED", "EXPIRED"].includes(verificationStatus)) {
      where.verificationStatus = verificationStatus;
    }

    const documents = await prisma.stationDocument.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    console.error("Documents fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
