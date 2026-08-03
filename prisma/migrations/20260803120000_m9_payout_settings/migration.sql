ALTER TABLE "Station" ADD COLUMN "payoutMethod" TEXT;
ALTER TABLE "Station" ADD COLUMN "payoutAccountName" TEXT;
ALTER TABLE "Station" ADD COLUMN "payoutAccountLast4" TEXT;
ALTER TABLE "Station" ADD COLUMN "payoutDetails" TEXT;
CREATE TABLE "OtpCode" ("id" TEXT NOT NULL PRIMARY KEY,"userId" TEXT NOT NULL,"purpose" TEXT NOT NULL,"codeHash" TEXT NOT NULL,"codeEncrypted" TEXT NOT NULL,"expiresAt" DATETIME NOT NULL,"consumedAt" DATETIME,"attempts" INTEGER NOT NULL DEFAULT 0,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "OtpCode_userId_purpose_idx" ON "OtpCode"("userId","purpose");
