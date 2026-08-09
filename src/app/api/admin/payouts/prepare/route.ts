import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, parsePeriod, money, payoutInclude } from "../_lib";
import { getActiveHoldsCentavos } from "@/lib/disputes";
import { getPaymentIntent } from "@/lib/paymongo";

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({error:"Forbidden"},{status:403});
  const period=parsePeriod(await req.json());
  if(!period)return NextResponse.json({error:"Invalid period (start must precede end; maximum 62 days)"},{status:400});
  const stations=await prisma.station.findMany({select:{id:true}}); const created:any[]=[];
  let ordersIncluded=0, gross=0, commission=0, fees=0, held=0, adjustments=0;
  for(const station of stations){
    const orders=await prisma.order.findMany({where:{stationId:station.id,status:"DELIVERED",paymentStatus:"PAID",payoutEligibleAt:{not:null,lte:period.end},payoutItems:{none:{}}},select:{id:true,total:true,amountCentavos:true,commissionCentavos:true,processingFeeCentavos:true,paymentId:true,paymentIntentId:true,stationNetCentavos:true}});
    for (const order of orders) {
      if (order.processingFeeCentavos == null && (order.paymentId || order.paymentIntentId)) {
        // order.paymentId stores the PAYMENT INTENT id (see gcash/intent route); fees live on the
        // intent's payments array, so fetch the intent and sum fees across its payments.
        const remote = await getPaymentIntent(order.paymentId || order.paymentIntentId!);
        if (remote.ok) {
          const attrs = (remote.data.attributes as any) || {};
          const payments = Array.isArray(attrs.payments) ? attrs.payments : [];
          const remoteFees = payments.flatMap((p: any) => Array.isArray(p?.attributes?.fees) ? p.attributes.fees : []);
          const fee = remoteFees.reduce((s:number, f:any) => s + (typeof f?.amount === "number" ? f.amount : 0), 0);
          await prisma.order.update({where:{id:order.id},data:{processingFeeCentavos:fee}}); (order as any).processingFeeCentavos=fee;
        } else console.warn("Unable to backfill PayMongo processing fee", {orderId:order.id, error:remote.error.message});
      }
    }
    const vals=orders.map(money); const g=vals.reduce((s,x)=>s+x.gross,0), c=vals.reduce((s,x)=>s+x.commission,0), f=vals.reduce((s,x)=>s+x.fee,0);
    const h=await getActiveHoldsCentavos(station.id);
    const recovered=await prisma.payoutItem.aggregate({where:{payout:{stationId:station.id,status:"PAID"},order:{paymentStatus:"REFUNDED"}},_sum:{netCentavos:true}});
    // Recover the station net actually paid; any PayMongo fee retained on refund stays with the station.
    const adjustment=-(recovered._sum.netCentavos||0); if(!orders.length && !adjustment)continue;
    const p=await prisma.$transaction(async tx=>{const payout=await tx.payout.create({data:{stationId:station.id,periodStart:period.start,periodEnd:period.end,grossCentavos:g,commissionCentavos:c,processingFeeCentavos:f,heldCentavos:h,adjustmentCentavos:adjustment,netCentavos:g-c-f-h+adjustment}}); if(orders.length) await tx.payoutItem.createMany({data:orders.map((o,i)=>({payoutId:payout.id,orderId:o.id,grossCentavos:vals[i].gross,commissionCentavos:vals[i].commission,processingFeeCentavos:vals[i].fee,heldCentavos:0,netCentavos:vals[i].net}))}); return tx.payout.findUnique({where:{id:payout.id},include:payoutInclude});});
    created.push(p); ordersIncluded+=orders.length; gross+=g; commission+=c; fees+=f; held+=h; adjustments+=adjustment;
  }
  return NextResponse.json({success:true,data:created,summary:{stationsProcessed:stations.length,payoutsCreated:created.length,ordersIncluded,grossCentavos:gross,commissionCentavos:commission,processingFeeCentavos:fees,heldCentavos:held,adjustmentCentavos:adjustments,netCentavos:gross-commission-fees-held+adjustments}});
}
