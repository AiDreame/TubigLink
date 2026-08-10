import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authorizeDashboardStation, isAuthorizedStation } from "@/lib/station-auth";

// GET /api/dashboard/orders/count — lightweight count of the station's new
// (PENDING) orders. Polled by the sidebar badge; intentionally returns just
// { count } with no order rows so it stays cheap.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await authorizeDashboardStation(searchParams.get("stationId"));
    if (!isAuthorizedStation(access)) return access;
    const count = await prisma.order.count({
      where: { stationId: access.stationId, status: "PENDING" },
    });
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Pending order count error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending order count" },
      { status: 500 }
    );
  }
}
