import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/stations/[id] — Get station details with products and reviews
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const station = await prisma.station.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        products: {
          where: { isAvailable: true },
          orderBy: { price: "asc" },
        },
        deliveryZones: true,
        reviews: {
          include: {
            user: { select: { name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        user: {
          select: { name: true, phone: true },
        },
      },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: station });
  } catch (error) {
    console.error("Station fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch station" },
      { status: 500 }
    );
  }
}

// PUT /api/stations/[id] — Update station details
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const station = await prisma.station.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ success: true, data: station });
  } catch (error) {
    console.error("Station update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update station" },
      { status: 500 }
    );
  }
}