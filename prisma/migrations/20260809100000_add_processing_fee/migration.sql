ALTER TABLE "Order" ADD COLUMN "processingFeeCentavos" INTEGER;
ALTER TABLE "Payout" ADD COLUMN "processingFeeCentavos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PayoutItem" ADD COLUMN "processingFeeCentavos" INTEGER NOT NULL DEFAULT 0;
