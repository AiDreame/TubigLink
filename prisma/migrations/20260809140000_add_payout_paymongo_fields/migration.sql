-- Add PayMongo wallet-transaction fields to track automatic disbursements.
ALTER TABLE "Payout" ADD COLUMN "paymongoTransactionId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "paymongoReferenceNumber" TEXT;
ALTER TABLE "Payout" ADD COLUMN "paymongoStatus" TEXT;
ALTER TABLE "Payout" ADD COLUMN "paymongoError" TEXT;
