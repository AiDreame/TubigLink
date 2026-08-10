-- Rework Notification for the in-app notification bell (owner, Aug 10 2026).
--   message -> body
--   data    -> link (relative path; best-effort extraction from the old JSON payload)
--   isRead  -> readAt (DateTime, null while unread; existing read rows backdated to createdAt)
-- Also adds the userId index for the per-user bell queries.
-- Uses the SQLite redefine pattern (same as Prisma-generated migrations).

-- CreateTable
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Migrate existing rows (Notification already exists in dev.db via schema drift).
INSERT INTO "new_Notification" ("id", "userId", "type", "title", "body", "link", "readAt", "createdAt")
SELECT "id", "userId", "type", "title", "message",
  CASE
    WHEN "data" IS NOT NULL AND json_valid("data") THEN
      CASE
        WHEN json_extract("data", '$.orderId') IS NOT NULL THEN '/orders/' || json_extract("data", '$.orderId')
        WHEN json_extract("data", '$.slug') IS NOT NULL THEN '/stations/' || json_extract("data", '$.slug')
        WHEN json_extract("data", '$.stationId') IS NOT NULL THEN '/stations/' || json_extract("data", '$.stationId')
        WHEN json_extract("data", '$.payoutId') IS NOT NULL THEN '/dashboard/earnings'
        ELSE NULL
      END
    ELSE NULL
  END,
  CASE WHEN "isRead" = 1 THEN "createdAt" ELSE NULL END,
  "createdAt"
FROM "Notification";

-- DropTable (old shape)
DROP TABLE "Notification";

-- RenameTable
ALTER TABLE "new_Notification" RENAME TO "Notification";

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
