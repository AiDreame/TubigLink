-- Phase 2a per-ticket Discord channels (Sep 9): index discordChannelId so the
-- inbound `channel_message` webhook event can reverse-map channel -> ticket.
-- (The columns themselves already exist from 20260818000000 / 20260819000000.)
CREATE INDEX IF NOT EXISTS "Dispute_discordChannelId_idx" ON "Dispute"("discordChannelId");
CREATE INDEX IF NOT EXISTS "SupportTicket_discordChannelId_idx" ON "SupportTicket"("discordChannelId");
