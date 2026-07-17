import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/stats — Get platform-wide statistics for the home page
export async function GET() {
  try {
    const [
      stations,
      orders,
      customers,
      citiesRaw,
    ] = await Promise.all([
      prisma.station.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.station.findMany({
        where: { isActive: true },
        select: { city: true },
        distinct: ["city"],
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stations,
        orders,
        cities: citiesRaw.length,
        customers,
      },
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}