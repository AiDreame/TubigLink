import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/admin/verification/documents — List all documents across all stations for admin review
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
    const page = Number(searchParams.get("page")) || 1;
    const verificationStatus = searchParams.get("verificationStatus") || undefined;
    const type = searchParams.get("type") || undefined;
    const stationId = searchParams.get("stationId") || undefined;

    // Build filter
    const where: any = {};
    if (verificationStatus && ["PENDING", "VERIFIED", "REJECTED", "EXPIRED"].includes(verificationStatus)) {
      where.verificationStatus = verificationStatus;
    }
    if (type) {
      where.type = type;
    }
    if (stationId) {
      where.stationId = stationId;
    }

    const [documents, total] = await Promise.all([
      prisma.stationDocument.findMany({
        where,
        include: {
          station: {
            select: {
              id: true,
              name: true,
              city: true,
              onboardingStep: true,
              onboardingSubmittedAt: true,
            },
          },
          verifiedBy: {
            select: { name: true },
          },
        },
        orderBy: { uploadedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stationDocument.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: documents,
      total,
      page,
      pageSize: limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("Admin documents fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
