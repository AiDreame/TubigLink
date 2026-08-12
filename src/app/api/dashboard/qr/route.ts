import { NextRequest, NextResponse } from "next/server";
import { getStationQr } from "@/lib/station-qr";

// GET /api/dashboard/qr — metadata for the station QR card (station name,
// encoded payload string). Role-guarded; non-owner/non-active-staff get 403.
export async function GET(req: NextRequest) {
  const result = await getStationQr(new URL(req.url).searchParams.get("stationId"));
  if (!result.ok) return result.response;
  return NextResponse.json({
    success: true,
    data: {
      station: result.station,
      payload: result.payload,
    },
  });
}
