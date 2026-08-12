import { NextRequest, NextResponse } from "next/server";
import { getStationQr } from "@/lib/station-qr";

// GET /api/dashboard/qr/png — high-res PNG of the station QR code.
// Default: Content-Disposition attachment (used by the "Download PNG" button).
// ?inline=1 serves it inline so the dashboard card can render it in an <img>.
// Same role guard as the JSON endpoint; denied callers get 401/403 JSON.
export async function GET(req: NextRequest) {
  const result = await getStationQr(new URL(req.url).searchParams.get("stationId"));
  if (!result.ok) return result.response;

  const inline = req.nextUrl.searchParams.get("inline") === "1";
  const filename = `aqualink-${result.station.slug || result.station.id}-qr.png`;

  return new NextResponse(new Uint8Array(result.png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": inline ? "inline" : `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
