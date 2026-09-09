-- Station document review via Discord (Sep 9): persist the review embed's
-- Discord message/channel ids on StationDocument so in-app decisions can PATCH
-- the embed and Discord button clicks can resolve back to the doc row.
ALTER TABLE "StationDocument" ADD COLUMN "discordMessageId" TEXT;
ALTER TABLE "StationDocument" ADD COLUMN "discordChannelId" TEXT;
