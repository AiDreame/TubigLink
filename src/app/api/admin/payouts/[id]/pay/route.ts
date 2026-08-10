import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "../../_lib";
import { decryptPayout } from "@/lib/payout-security";
import { createWalletTransaction, PAYOUT_DISBURSEMENT_FEE_PESOS } from "@/lib/paymongo-disbursement";

/**
 * Initiate an automatic disbursement for a PROCESSING payout via the
 * PayMongo Disbursements API (Create a Wallet Transaction). Replaces the old
 * manual "mark as paid with a transfer reference" step.
 *
 * Status outcomes (persisted from the PayMongo response):
 *   succeeded -> PAID (paidAt set, station notified)
 *   failed    -> FAILED (paymongoError/failureMessage set)
 *   pending   -> PAYING (intermediate; the transfer.outward.* webhook finalizes)
 *
 * Idempotency: the PayMongo Idempotency-Key is the payout id, and a payout
 * with paymongoTransactionId already set is never re-sent.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = await prisma.payout.findUnique({ where: { id: params.id }, include: { station: true } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (p.status !== "PROCESSING") return NextResponse.json({ error: "Payout must be PROCESSING" }, { status: 400 });
  // Idempotency guard: a disbursement was already initiated for this payout.
  if (p.paymongoTransactionId) {
    return NextResponse.json(
      { error: "Disbursement already initiated for this payout (idempotency guard)" },
      { status: 409 },
    );
  }
  if (p.netCentavos <= 0) {
    const belowFee = (p.disbursementFeeCentavos ?? 0) > 0;
    return NextResponse.json(
      {
        error: belowFee
          ? `Payout net amount must be positive — net is ₱0.00 because it was below the ₱${PAYOUT_DISBURSEMENT_FEE_PESOS} transfer fee (deducted from the payout). The station receives nothing; no transfer is sent.`
          : "Payout net amount must be positive",
      },
      { status: 400 },
    );
  }
  const station = p.station;
  if (!station.payoutMethod || !station.payoutDetails) {
    return NextResponse.json({ error: "Station has no payout account configured" }, { status: 400 });
  }
  if (!station.payoutAccountName) {
    return NextResponse.json({ error: "Station has no payout account name" }, { status: 400 });
  }
  let accountNumber: string;
  try {
    const details = JSON.parse(decryptPayout(station.payoutDetails));
    accountNumber = String(details?.accountNumber || "");
  } catch {
    return NextResponse.json({ error: "Unable to read station payout details" }, { status: 500 });
  }
  if (!accountNumber) {
    return NextResponse.json({ error: "Station payout account number is empty" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.INVITE_BASE_URL || "";
  const result = await createWalletTransaction({
    amountCentavos: p.netCentavos,
    idempotencyKey: p.id,
    callbackUrl: appUrl ? `${appUrl}/api/webhooks/paymongo` : undefined,
    target: {
      method: station.payoutMethod,
      bankName: station.payoutBankName,
      accountName: station.payoutAccountName,
      accountNumber,
    },
  });

  if (!result.ok) {
    // The provider (or our mapping) rejected the transfer at creation time.
    const message = result.error.message;
    await prisma.payout.update({
      where: { id: p.id },
      data: {
        status: "FAILED",
        failureMessage: message,
        paymongoStatus: "failed",
        paymongoError: message,
      },
    });
    return NextResponse.json(
      { success: false, error: message, ...(result.error.code ? { code: result.error.code } : {}) },
      { status: 502 },
    );
  }

  const tx = result.data;
  const data = await prisma.$transaction(async (prismaTx) => {
    const payout = await prismaTx.payout.update({
      where: { id: p.id },
      data: {
        paymongoTransactionId: tx.id,
        paymongoReferenceNumber: tx.referenceNumber || null,
        paymongoStatus: tx.status,
        paymongoError: tx.providerError || null,
        ...(tx.status === "succeeded"
          ? { status: "PAID", paidAt: new Date(), transferReference: tx.referenceNumber || null }
          : {}),
        ...(tx.status === "failed"
          ? { status: "FAILED", failureMessage: tx.providerError || "PayMongo disbursement failed" }
          : {}),
        ...(tx.status === "pending" ? { status: "PAYING" } : {}),
      },
    });
    if (tx.status === "succeeded") {
      const periodLabel = `${p.periodStart.toISOString().slice(0, 10)} to ${p.periodEnd.toISOString().slice(0, 10)}`;
      await prismaTx.notification.create({
        data: {
          userId: station.userId,
          type: "PAYOUT",
          title: "Payout sent",
          body: `Your payout of ₱${(p.netCentavos / 100).toFixed(2)} for ${periodLabel} has been paid.`,
          link: "/dashboard/earnings",
        },
      });
    }
    return payout;
  });

  return NextResponse.json({
    success: true,
    data,
    disbursement: { status: tx.status, id: tx.id, referenceNumber: tx.referenceNumber },
    note:
      tx.status === "pending"
        ? `Disbursement is ${tx.status}; the transfer.outward webhook will finalize it. (Transfer fee ₱${PAYOUT_DISBURSEMENT_FEE_PESOS} was deducted from this payout.)`
        : `Transfer fee ₱${PAYOUT_DISBURSEMENT_FEE_PESOS} was deducted from this payout.`,
  });
}
