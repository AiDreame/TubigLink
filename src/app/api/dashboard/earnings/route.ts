import { NextRequest, NextResponse } from "next/server";
import { authorizeDashboardStation, isAuthorizedStation } from "@/lib/station-auth";
import { getStationEarnings } from "@/lib/earnings";
export async function GET(req: NextRequest) { const access=await authorizeDashboardStation(new URL(req.url).searchParams.get("stationId")); if(!isAuthorizedStation(access)) return access; return NextResponse.json({success:true,data:await getStationEarnings(access.stationId)}); }
