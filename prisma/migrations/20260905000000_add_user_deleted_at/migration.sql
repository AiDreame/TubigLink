-- Add deletedAt to User for Apple 5.1.1(v) account deletion (soft-delete tombstone)
ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME;
