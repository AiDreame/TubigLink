-- Add bank name needed to resolve PayMongo disbursement institutions.
ALTER TABLE "Station" ADD COLUMN "payoutBankName" TEXT;
