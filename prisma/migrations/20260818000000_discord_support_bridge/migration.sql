-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN "discordThreadId" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "discordChannelId" TEXT;

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disputeId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_idx" ON "DisputeMessage"("disputeId");

-- CreateIndex
CREATE INDEX "Dispute_discordThreadId_idx" ON "Dispute"("discordThreadId");
