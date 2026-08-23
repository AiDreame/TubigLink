import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getDiscordConfig,
  discordSecretOk,
  TICKET_MARKER_RE,
} from "@/lib/discord";
import { createNotification, notifyAllAdmins, notifyStationUsers } from "@/lib/notifications";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * Incoming endpoint called by scripts/discord-bot.mjs (and by the app itself for
 * binding). Two events:
 *
 *   bind    { action:"bind", disputeId, threadId, channelId }
 *           -> store discordThreadId on the dispute so follow-up app messages
 *              are posted into the right thread.
 *
 *   message { action:"message", threadId, content, authorName, authorId }
 *           -> reverse-map threadId -> dispute by discordThreadId, then append
 *              a DisputeMessage (authorRole=STAFF) so the support reply is
 *              visible 3-party (customer / station / admin) in the app.
 *
 * SECURITY: every call must carry the shared secret as a Bearer token
 * (DISCORD_WEBHOOK_SECRET). Without the secret configured the route is fully
 * disabled (404). There is no unauthenticated path — this is not a
 * message-injection vector.
 */
export async function POST(req: NextRequest) {
  // Fully disabled unless the shared secret is configured.
  const cfg = getDiscordConfig();
  if (!cfg || !cfg.webhookSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = req.headers.get("authorization") || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!discordSecretOk(supplied)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const action = String(body.action || "");

  if (action === "bind") {
    const disputeId = String(body.disputeId || "").trim();
    const threadId = String(body.threadId || "").trim();
    const channelId = body.channelId == null ? null : String(body.channelId).trim();
    if (!disputeId || !/^\d+$/.test(threadId)) {
      return NextResponse.json({ error: "Invalid bind payload" }, { status: 400 });
    }
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }
    // Only allow a bind if the dispute is not already bound to a different thread.
    if (dispute.discordThreadId && dispute.discordThreadId !== threadId) {
      return NextResponse.json({ error: "Dispute already bound" }, { status: 409 });
    }
    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: { discordThreadId: threadId, discordChannelId: channelId },
    });
    return NextResponse.json({ success: true, data: { disputeId, threadId } });
  }

  if (action === "message") {
    // Skip the app's own bot replies (loop guard). Configurable so the team can
    // point the bot or the webhook at the same identity without self-echoing.
    if (cfg.selfUserId && String(body.authorId || "") === cfg.selfUserId) {
      return NextResponse.json({ success: true, ignored: "self" });
    }
    const threadId = String(body.threadId || "").trim();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!/^\d+$/.test(threadId) || !content || content.length > 4000) {
      return NextResponse.json({ error: "Invalid message payload" }, { status: 400 });
    }

    const dispute = await prisma.dispute.findFirst({
      where: { discordThreadId: threadId },
      include: { order: true, station: { select: { name: true } } },
    });
    if (!dispute) {
      return NextResponse.json({ error: "No dispute for thread" }, { status: 404 });
    }

    // Rate-limit inbound per thread (anti-spam even though the sender is
    // authenticated via the shared secret).
    const rl = rateLimit(`discord-inbound:${threadId}`, 30, 60 * 1000);
    if (!rl.ok) return tooManyRequests("Rate limit exceeded", rl.retryAfterSec);

    const authorName = String(body.authorName || "Support").trim().slice(0, 80) || "Support";
    const message = await prisma.disputeMessage.create({
      data: {
        disputeId: dispute.id,
        authorRole: "STAFF",
        authorName,
        content,
      },
    });

    // Notify the customer, the station and every admin that support replied.
    await createNotification({
      userId: dispute.customerId,
      type: "DISPUTE",
      title: "Support replied",
      body: `AquaLink support replied to your issue report on order #${dispute.orderId.slice(0, 8)}.`,
      link: `/orders/${dispute.orderId}`,
    });
    await notifyStationUsers(dispute.stationId, {
      type: "DISPUTE",
      title: "Support replied to dispute",
      body: `AquaLink support replied to the dispute on order #${dispute.orderId.slice(0, 8)}.`,
      link: "/dashboard/disputes",
    });
    await notifyAllAdmins({
      type: "DISPUTE",
      title: "Support replied to dispute",
      body: `AquaLink support replied to the dispute on order #${dispute.orderId.slice(0, 8)}.`,
      link: "/admin/disputes",
    });

    return NextResponse.json({ success: true, data: message });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// GET: disabled — nothing to expose.
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
