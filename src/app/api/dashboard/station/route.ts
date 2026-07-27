import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/dashboard/station — Get the current provider's station with delivery zones
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const station = await prisma.station.findFirst({
      where: { userId },
      include: {
        deliveryZones: true,
        products: {
          select: { id: true, name: true, type: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "No station found for this account" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: station });
  } catch (error) {
    console.error("Dashboard station fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch station" },
      { status: 500 }
    );
  }
}

// PUT /api/dashboard/station — Update the current provider's station
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    // Find the station owned by this user
    const existingStation = await prisma.station.findFirst({
      where: { userId },
    });

    if (!existingStation) {
      return NextResponse.json(
        { success: false, error: "No station found for this account" },
        { status: 404 }
      );
    }

    // Separate delivery zones from station fields
    const { deliveryZones, ...stationFields } = body;

    // Validate allowed station fields
    const allowedFields = [
      "name", "description", "logo", "banner", "phone",
      "address", "barangay", "city", "province",
      "latitude", "longitude",
      "deliveryFee", "minOrder",
      "openingTime", "closingTime",
      "isActive", "isFeatured",
      "tin", "businessType",
    ];

    const filteredFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(stationFields)) {
      if (allowedFields.includes(key)) {
        filteredFields[key] = value;
      }
    }

    // Update slug if name changes
    if (filteredFields.name && filteredFields.name !== existingStation.name) {
      filteredFields.slug = filteredFields.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    // Update station
    const updatedStation = await prisma.station.update({
      where: { id: existingStation.id },
      data: filteredFields,
    });

    // Handle delivery zones if provided
    if (Array.isArray(deliveryZones)) {
      // Delete all existing zones
      await prisma.deliveryZone.deleteMany({
        where: { stationId: existingStation.id },
      });

      // Create new zones
      if (deliveryZones.length > 0) {
        await prisma.deliveryZone.createMany({
          data: deliveryZones.map((zone: any) => ({
            stationId: existingStation.id,
            barangay: zone.barangay,
            city: zone.city || existingStation.city,
            deliveryFee: zone.deliveryFee || 0,
            estimatedMinutes: zone.estimatedMinutes || 30,
          })),
        });
      }
    }

    // Return updated station with delivery zones
    const result = await prisma.station.findUnique({
      where: { id: existingStation.id },
      include: { deliveryZones: true },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Dashboard station update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update station" },
      { status: 500 }
    );
  }
}
