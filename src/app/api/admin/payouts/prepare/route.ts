import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, parsePeriod, money, payoutInclude } from "../_lib";
import { getActiveHoldsCentavos } from "@/lib/disputes";
import { applyDeliveryAutoConfirmMany } from "@/lib/delivery";
import { getPaymentIntent } from "@/lib/paymongo";
import { PAYOUT_DISBURSEMENT_FEE_PESOS } from "@/lib/paymongo-disbursement";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({error:"Forbidden"},{status:403});
  const period=parsePeriod(await req.json());
  if(!period)return NextResponse.json({error:"Invalid period (start must precede end; maximum 62 days)"},{status:400});
  const stations=await prisma.station.findMany({select:{id:true}}); const created:any[]=[];
  let ordersIncluded=0, gross=0, commission=0, fees=0, held=0, adjustments=0, disbursementFees=0, netTotal=0;
  // ₱10 PayMongo transfer fee — station-borne (owner Aug 9): always recorded and
  // deducted at payout creation; net is floored at 0 (station gets nothing, no
  // zero transfer is sent — the pay route rejects netCentavos <= 0).
  const disbursementFeeCentavos = PAYOUT_DISBURSEMENT_FEE_PESOS * 100;
  for(const station of stations){
    // Audit I3 backfill: converge the lazy 24h auto-confirm BEFORE filtering on
    // payoutEligibleAt so a DELIVERED order that passed its window but was never
    // read still becomes eligible instead of silently missing the weekly payout.
    const fetched=await prisma.order.findMany({where:{stationId:station.id,status:"DELIVERED",paymentStatus:"PAID",deliveredAt:{not:null},payoutItems:{none:{}}},select:{id:true,total:true,amountCentavos:true,commissionCentavos:true,processingFeeCentavos:true,paymentId:true,paymentIntentId:true,stationNetCentavos:true,status:true,deliveredAt:true,deliveryConfirmedAt:true,payoutEligibleAt:true}});
    const orders=await applyDeliveryAutoConfirmMany(fetched);
    const eligible=orders.filter((o:any)=>o.payoutEligibleAt && new Date(o.payoutEligibleAt).getTime() <= period.end.getTime());
    for (const order of eligible) {
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
    const vals=eligible.map(money); const g=vals.reduce((s,x)=>s+x.gross,0), c=vals.reduce((s,x)=>s+x.commission,0), f=vals.reduce((s,x)=>s+x.fee,0);
    const h=await getActiveHoldsCentavos(station.id);
    const recovered=await prisma.payoutItem.aggregate({where:{payout:{stationId:station.id,status:"PAID"},order:{paymentStatus:"REFUNDED"}},_sum:{netCentavos:true}});
    // Recover the station net actually paid; any PayMongo fee retained on refund stays with the station.
    const adjustment=-(recovered._sum.netCentavos||0); if(!eligible.length && !adjustment)continue;
    // netCentavos = gross − commission − processingFee − held − adjustments − disbursementFee, floored at 0.
    const netCentavos=Math.max(0, g-c-f-h+adjustment-disbursementFeeCentavos);
    const p=await prisma.$transaction(async tx=>{const payout=await tx.payout.create({data:{stationId:station.id,periodStart:period.start,periodEnd:period.end,grossCentavos:g,commissionCentavos:c,processingFeeCentavos:f,disbursementFeeCentavos,heldCentavos:h,adjustmentCentavos:adjustment,netCentavos}}); if(eligible.length) await tx.payoutItem.createMany({data:eligible.map((o,i)=>({payoutId:payout.id,orderId:o.id,grossCentavos:vals[i].gross,commissionCentavos:vals[i].commission,processingFeeCentavos:vals[i].fee,heldCentavos:0,netCentavos:vals[i].net}))}); return tx.payout.findUnique({where:{id:payout.id},include:payoutInclude});});
    created.push(p); ordersIncluded+=eligible.length; gross+=g; commission+=c; fees+=f; held+=h; adjustments+=adjustment; disbursementFees+=disbursementFeeCentavos; netTotal+=netCentavos;
  }
  for (const p of created) { void recordAudit({ action: "payout.prepare", entityType: "payout", entityId: (p as any)?.id, details: { stationId: (p as any)?.stationId, netCentavos: (p as any)?.netCentavos, ordersIncluded: (p as any)?.payoutItems?.length ?? undefined } }); }
  return NextResponse.json({success:true,data:created,summary:{stationsProcessed:stations.length,payoutsCreated:created.length,ordersIncluded,grossCentavos:gross,commissionCentavos:commission,processingFeeCentavos:fees,heldCentavos:held,adjustmentCentavos:adjustments,disbursementFeeCentavos:disbursementFees,netCentavos:netTotal}});
}
