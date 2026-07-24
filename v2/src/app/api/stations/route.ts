import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/stations — List all active stations with optional filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const barangay = searchParams.get("barangay");
    const featured = searchParams.get("featured");
    const query = searchParams.get("query");
    const waterType = searchParams.get("type");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
    const page = Number(searchParams.get("page")) || 1;

    // Build filter conditions
    const where: any = { isActive: true };

    if (city) where.city = { contains: city };
    if (barangay) where.barangay = { contains: barangay };
    if (featured === "true") where.isFeatured = true;
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
        { barangay: { contains: query } },
      ];
    }
    if (waterType) {
      where.products = {
        some: { type: waterType.toUpperCase(), isAvailable: true },
      };
    }

    const [stations, total] = await Promise.all([
      prisma.station.findMany({
        where,
        include: {
          products: {
            where: { isAvailable: true },
            take: 5,
          },
          deliveryZones: true,
          _count: { select: { reviews: true } },
        },
        orderBy: [{ isFeatured: "desc" }, { rating: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.station.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: stations,
      total,
      page,
      pageSize: limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("Stations fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stations" },
      { status: 500 }
    );
  }
}

// POST /api/stations — Create a new station (PROVIDER only)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, address, barangay, city, province, phone } = body;

    if (!userId || !name) {
      return NextResponse.json(
        { error: "User ID and station name are required" },
        { status: 400 }
      );
    }

    // Check if user exists and is a provider
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Only providers can create stations" },
        { status: 403 }
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .substring(0, 50) + "-" + Math.random().toString(36).substring(2, 6);

    const station = await prisma.station.create({
      data: {
        userId,
        name,
        slug,
        address: address || "",
        barangay: barangay || "",
        city: city || "Manila",
        province: province || "Metro Manila",
        phone,
      },
    });

    return NextResponse.json({ success: true, data: station }, { status: 201 });
  } catch (error) {
    console.error("Station creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create station" },
      { status: 500 }
    );
  }
}