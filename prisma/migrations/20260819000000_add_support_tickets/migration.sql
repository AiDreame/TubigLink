-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "discordThreadId" TEXT,
    "discordChannelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupportTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables: DisputeMessage becomes nullable parent (disputeId? + ticketId?)
CREATE TABLE "new_DisputeMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disputeId" TEXT,
    "ticketId" TEXT,
    "authorRole" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DisputeMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DisputeMessage" ("id", "disputeId", "ticketId", "authorRole", "authorName", "content", "createdAt")
SELECT "id", "disputeId", NULL, "authorRole", "authorName", "content", "createdAt" FROM "DisputeMessage";
DROP TABLE "DisputeMessage";
ALTER TABLE "new_DisputeMessage" RENAME TO "DisputeMessage";

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_idx" ON "DisputeMessage"("disputeId");
CREATE INDEX "DisputeMessage_ticketId_idx" ON "DisputeMessage"("ticketId");
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX "SupportTicket_orderId_idx" ON "SupportTicket"("orderId");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportTicket_discordThreadId_idx" ON "SupportTicket"("discordThreadId");
