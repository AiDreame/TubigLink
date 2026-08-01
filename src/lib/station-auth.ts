import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export type AuthorizedStation = { stationId: string; session: any };

/** Resolve dashboard access from current database state, never from JWT station claims. */
export async function authorizeDashboardStation(
  requestedStationId?: string | null
): Promise<AuthorizedStation | NextResponse> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const role = user.role;
  if (role === "ADMIN") {
    if (!requestedStationId) {
      return NextResponse.json({ error: "stationId is required for admin access" }, { status: 400 });
    }
    const station = await prisma.station.findUnique({ where: { id: requestedStationId }, select: { id: true } });
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
    return { stationId: station.id, session };
  }

  if (role === "PROVIDER") {
    const station = await prisma.station.findFirst({
      where: { userId: user.id, ...(requestedStationId ? { id: requestedStationId } : {}) },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    if (!station) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    return { stationId: station.id, session };
  }

  // Only active manager/admin staff receive dashboard access. Staff membership is
  // resolved from current DB state rather than the (possibly stale) JWT claims.
  if (role !== "STAFF" && role !== "DRIVER") {
    const staff = await prisma.stationStaff.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["MANAGER", "ADMIN"] },
        ...(requestedStationId ? { stationId: requestedStationId } : {}),
      },
      orderBy: { stationId: "asc" },
      select: { stationId: true },
    });
    if (staff) return { stationId: staff.stationId, session };
  }

  return NextResponse.json({ error: "Access denied" }, { status: 403 });
}

export function isAuthorizedStation(value: AuthorizedStation | NextResponse): value is AuthorizedStation {
  return !(value instanceof NextResponse);
}
