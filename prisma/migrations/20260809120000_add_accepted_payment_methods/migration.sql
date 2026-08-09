-- Station-level accepted payment methods (JSON string array, default GCash only)
ALTER TABLE "Station" ADD COLUMN "acceptedPaymentMethods" TEXT NOT NULL DEFAULT '["gcash"]';
