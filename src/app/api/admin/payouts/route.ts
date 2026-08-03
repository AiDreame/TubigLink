import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, payoutInclude } from "./_lib";
export async function GET(req: NextRequest) { if (!await requireAdmin()) return NextResponse.json({error:"Forbidden"},{status:403}); const status=req.nextUrl.searchParams.get("status")||undefined; const data=await prisma.payout.findMany({where:status?{status}:undefined,include:payoutInclude,orderBy:{createdAt:"desc"}}); return NextResponse.json({success:true,data}); }
