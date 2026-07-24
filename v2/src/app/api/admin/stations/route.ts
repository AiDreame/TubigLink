import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/stations — Get all stations (for admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stations = await prisma.station.findMany({
      include: {
        user: { select: { name: true, phone: true, email: true } },
        _count: { select: { products: true, orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: stations });
  } catch (error) {
    console.error("Admin stations fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stations" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/stations — Update station status (verify, feature, activate)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { stationId, isActive, isFeatured, deliveryFee, minOrder } = body;

    if (!stationId) {
      return NextResponse.json({ error: "Station ID is required" }, { status: 400 });
    }

    const updatedStation = await prisma.station.update({
      where: { id: stationId },
      data: {
        isActive,
        isFeatured,
        deliveryFee,
        minOrder,
      },
    });

    return NextResponse.json({ success: true, data: updatedStation });
  } catch (error) {
    console.error("Admin station update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update station" },
      { status: 500 }
    );
  }
}
