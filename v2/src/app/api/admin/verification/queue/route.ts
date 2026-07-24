import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/admin/verification/queue — Get stations with pending documents for admin review
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
    const page = Number(searchParams.get("page")) || 1;
    const status = searchParams.get("status") || "PENDING"; // Filter by doc status

    // Find all stations that have at least one document with the given verification status
    // Group by station, include document counts and station info
    const where: any = {
      documents: {
        some: {
          verificationStatus: status,
        },
      },
    };

    const [stations, total] = await Promise.all([
      prisma.station.findMany({
        where,
        include: {
          user: {
            select: { name: true, phone: true, email: true },
          },
          documents: {
            orderBy: { uploadedAt: "desc" },
          },
          _count: {
            select: {
              documents: true,
              orders: true,
              products: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.station.count({ where }),
    ]);

    // Enhance each station with document summary counts
    const enriched = stations.map((station) => {
      const docCounts = {
        total: station.documents.length,
        pending: station.documents.filter((d) => d.verificationStatus === "PENDING").length,
        verified: station.documents.filter((d) => d.verificationStatus === "VERIFIED").length,
        rejected: station.documents.filter((d) => d.verificationStatus === "REJECTED").length,
        expired: station.documents.filter((d) => d.verificationStatus === "EXPIRED").length,
      };
      return {
        ...station,
        documentSummary: docCounts,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      total,
      page,
      pageSize: limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("Admin verification queue fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch verification queue" },
      { status: 500 }
    );
  }
}
