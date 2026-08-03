import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encryptPayout, verifyOtp } from "@/lib/payout-security";

async function access(req: NextRequest, body?: any) {
 const user:any=(await getServerSession(authOptions))?.user; if(!user?.id) return {error:NextResponse.json({error:"Unauthorized"},{status:401})};
 const stationId=body?.stationId || new URL(req.url).searchParams.get("stationId");
 const station= user.role==="ADMIN" && stationId ? await prisma.station.findUnique({where:{id:stationId}}) : await prisma.station.findFirst({where:{userId:user.id}});
 if(!station || (user.role!=="ADMIN" && station.userId!==user.id)) return {error:NextResponse.json({error:"Forbidden"},{status:403})}; return {user,station};
}
function masked(s:any){return {payoutMethod:s.payoutMethod,payoutAccountName:s.payoutAccountName,payoutAccountLast4:s.payoutAccountLast4,maskedAccountNumber:s.payoutAccountLast4?`•••• ${s.payoutAccountLast4}`:null,hasPayoutAccount:!!s.payoutDetails};}
export async function GET(req:NextRequest){try{const a=await access(req);if(a.error)return a.error;return NextResponse.json({success:true,data:masked(a.station)});}catch(e){console.error(e);return NextResponse.json({error:"Failed"},{status:500});}}
export async function POST(req:NextRequest){try{const body=await req.json();const a=await access(req,body);if(a.error)return a.error; if(!["ADD","EDIT"].includes(body.action)||!['BANK','GCASH'].includes(body.payoutMethod))return NextResponse.json({error:"Invalid payout details"},{status:400}); const n=String(body.accountNumber||"").replace(/\s/g,""); if(!/^\d{6,17}$/.test(n)||(body.payoutMethod==="BANK"&&!/^\d{12}$/.test(n)))return NextResponse.json({error:"Invalid account number"},{status:400}); if(!(await verifyOtp(a.station.userId,`PAYOUT_${body.action}`,body.code)))return NextResponse.json({error:"Invalid, expired, or already used code"},{status:400}); const updated=await prisma.station.update({where:{id:a.station.id},data:{payoutMethod:body.payoutMethod,payoutAccountName:String(body.accountName||"").slice(0,120),payoutAccountLast4:n.slice(-4),payoutDetails:encryptPayout(JSON.stringify({accountNumber:n}))}});return NextResponse.json({success:true,data:masked(updated)});}catch(e){console.error(e);return NextResponse.json({error:"Failed"},{status:500});}}
export async function PATCH(req:NextRequest){return POST(req);}
export async function DELETE(req:NextRequest){try{const body=await req.json();const a=await access(req,body);if(a.error)return a.error;if(!(await verifyOtp(a.station.userId,"PAYOUT_REMOVE",body.code)))return NextResponse.json({error:"Invalid, expired, or already used code"},{status:400});await prisma.station.update({where:{id:a.station.id},data:{payoutMethod:null,payoutAccountName:null,payoutAccountLast4:null,payoutDetails:null}});return NextResponse.json({success:true});}catch(e){return NextResponse.json({error:"Failed"},{status:500});}}
