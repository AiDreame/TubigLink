-- Add the PayMongo disbursement fee (₱10/transfer) to the payout ledger.
-- Station-borne (owner, Aug 9 2026): deducted from the payout at creation.
-- Existing rows default to 0 (fee applied to all future payouts at creation).
ALTER TABLE "Payout" ADD COLUMN "disbursementFeeCentavos" INTEGER DEFAULT 0;
