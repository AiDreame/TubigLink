import { NextResponse } from "next/server";
import QRCode from "qrcode";
import prisma from "@/lib/prisma";
import { authorizeDashboardStation, isAuthorizedStation } from "@/lib/station-auth";

/**
 * Shared helper for the station QR feature (dashboard page + PNG download).
 *
 * Authorization mirrors the other /dashboard/* API routes via
 * authorizeDashboardStation: the station owner (PROVIDER), an admin, or an
 * ACTIVE manager/admin staff member may access — and only THEIR OWN station.
 * An optional `stationId` query param is honored so that requesting a station
 * the caller doesn't belong to returns 403 (station ownership is scoped
 * through the same DB-backed lookup used everywhere else in the dashboard).
 */

export type StationQrResult =
  | { ok: true; station: { id: string; name: string; slug: string }; payload: string; png: Buffer }
  | { ok: false; response: NextResponse };

export async function getStationQr(
  requestedStationId?: string | null
): Promise<StationQrResult> {
  const access = await authorizeDashboardStation(requestedStationId);
  if (!isAuthorizedStation(access)) {
    return { ok: false, response: access };
  }

  const station = await prisma.station.findUnique({
    where: { id: access.stationId },
    select: { id: true, name: true, slug: true },
  });
  if (!station) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Station not found" }, { status: 404 }),
    };
  }

  // Payload is built server-side so NEXT_PUBLIC_APP_URL is read here, never in
  // a client bundle. Scanning the code opens the (public, unauthenticated)
  // station page in the phone browser with a ?ref=qr marker for attribution.
  const payload = `${process.env.NEXT_PUBLIC_APP_URL || ""}/stations/${station.id}?ref=qr`;

  // High-resolution PNG (1024px) — crisp when printed on paper.
  const png = await QRCode.toBuffer(payload, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return { ok: true, station, payload, png };
}
