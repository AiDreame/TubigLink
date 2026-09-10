import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDiscordConfig, discordSecretOk } from "@/lib/discord";
import { DOC_CUSTOM_ID_RE } from "@/lib/discord-docs";
import { recordAudit } from "@/lib/audit";
import { createNotification, notifyAllAdmins, notifyStationUsers } from "@/lib/notifications";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * Privacy (owner): Discord-originated support replies must never expose the
 * staff member's personal Discord handle to customers. We therefore persist an
 * empty display name for those messages — the ticket renderers show STAFF
 * messages as "AquaLink Support" and omit the "· name" suffix whenever
 * authorName is falsy (checked in src/app/support/[id]/page.tsx and
 * src/app/orders/[id]/page.tsx). The bot keeps sending authorName in its
 * payloads (other consumers may use it); we simply don't store it here.
 */
const DISCORD_STAFF_AUTHOR_NAME = "";

/**
 * Incoming endpoint called by scripts/discord-bot.mjs (and by the app itself for
 * binding). Three events:
 *
 *   bind    { action:"bind", disputeId, threadId, channelId }
 *           -> store discordThreadId on the dispute so follow-up app messages
 *              are posted into the right thread (legacy thread flow).
 *
 *   message { action:"message", threadId, content, authorName, authorId }
 *           -> reverse-map threadId -> dispute by discordThreadId, then append
 *              a DisputeMessage (authorRole=STAFF, authorName masked to "" for
 *              privacy — the Discord handle never reaches the ticket UI) so the
 *              support reply is visible 3-party (customer / station / admin).
 *
 *   channel_message { action:"channel_message", channelId, content,
 *                     authorName, authorAvatar?, authorId?, timestamp? }
 *
 *   doc_decision { action:"doc_decision", customId, userId, userName, reason? }
 *           -> parse `doc_approve:<docId>` / `doc_reject:<docId>`, flip the
 *              StationDocument row (idempotent), audit + notify, and PATCH
 *              the station-docs embed (recolor + buttons disabled).
 *           -> reverse-map channelId -> dispute/ticket by discordChannelId
 *              (Phase 2a per-ticket channels), then append the same STAFF
 *              DisputeMessage (authorName masked to "") + notifications as
 *              `message`.
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
    const ticketId = String(body.disputeId || "").trim();
    const threadId = String(body.threadId || "").trim();
    const channelId = body.channelId == null ? null : String(body.channelId).trim();
    if (!ticketId || !/^\d+$/.test(threadId)) {
      return NextResponse.json({ error: "Invalid bind payload" }, { status: 400 });
    }
    // The marker id can be a Dispute id OR a SupportTicket id (Aug 19).
    const dispute = await prisma.dispute.findUnique({ where: { id: ticketId } });
    if (dispute) {
      if (dispute.discordThreadId && dispute.discordThreadId !== threadId) {
        return NextResponse.json({ error: "Already bound" }, { status: 409 });
      }
      await prisma.dispute.update({
        where: { id: ticketId },
        data: { discordThreadId: threadId, discordChannelId: channelId },
      });
      return NextResponse.json({ success: true, data: { ticketId, threadId } });
    }
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (ticket.discordThreadId && ticket.discordThreadId !== threadId) {
      return NextResponse.json({ error: "Already bound" }, { status: 409 });
    }
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { discordThreadId: threadId, discordChannelId: channelId },
    });
    return NextResponse.json({ success: true, data: { ticketId, threadId } });
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

    // Reverse-map threadId -> Dispute OR SupportTicket (Aug 19).
    const dispute = await prisma.dispute.findFirst({
      where: { discordThreadId: threadId },
      include: { order: true, station: { select: { name: true } } },
    });
    const ticket = dispute
      ? null
      : await prisma.supportTicket.findFirst({
          where: { discordThreadId: threadId },
          include: { user: { select: { name: true, phone: true } }, order: true },
        });
    if (!dispute && !ticket) {
      return NextResponse.json({ error: "No ticket for thread" }, { status: 404 });
    }

    // Rate-limit inbound per thread (anti-spam even though the sender is
    // authenticated via the shared secret).
    const rl = rateLimit(`discord-inbound:${threadId}`, 30, 60 * 1000);
    if (!rl.ok) return tooManyRequests("Rate limit exceeded", rl.retryAfterSec);

    // Masked: never persist the Discord handle (see DISCORD_STAFF_AUTHOR_NAME).
    const authorName = DISCORD_STAFF_AUTHOR_NAME;
    return appendStaffReply({ dispute, ticket, authorName, content });
  }

  if (action === "channel_message") {
    // Phase 2a: a staff reply typed in a `ticket-*` channel, forwarded by the
    // bot. Same self-echo guard as the legacy path.
    if (cfg.selfUserId && String(body.authorId || "") === cfg.selfUserId) {
      return NextResponse.json({ success: true, ignored: "self" });
    }
    const channelId = String(body.channelId || "").trim();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!/^\d+$/.test(channelId) || !content || content.length > 4000) {
      return NextResponse.json({ error: "Invalid message payload" }, { status: 400 });
    }

    // Reverse-map channelId -> Dispute OR SupportTicket by discordChannelId.
    const dispute = await prisma.dispute.findFirst({
      where: { discordChannelId: channelId },
      include: { order: true, station: { select: { name: true } } },
    });
    const ticket = dispute
      ? null
      : await prisma.supportTicket.findFirst({
          where: { discordChannelId: channelId },
          include: { user: { select: { name: true, phone: true } }, order: true },
        });
    if (!dispute && !ticket) {
      return NextResponse.json({ error: "No ticket for channel" }, { status: 404 });
    }

    const rl = rateLimit(`discord-inbound:${channelId}`, 30, 60 * 1000);
    if (!rl.ok) return tooManyRequests("Rate limit exceeded", rl.retryAfterSec);

    // Masked: never persist the Discord handle (see DISCORD_STAFF_AUTHOR_NAME).
    const authorName = DISCORD_STAFF_AUTHOR_NAME;
    return appendStaffReply({ dispute, ticket, authorName, content });
  }

  if (action === "doc_decision") {
    // Station-doc review from the station-docs channel buttons (customId
    // `doc_approve:<docId>` / `doc_reject:<docId>`), forwarded by the bot.
    // Idempotent: an already-decided doc returns { already:true }.
    const customId = String(body.customId || "").trim();
    const m = customId.match(DOC_CUSTOM_ID_RE);
    if (!m) {
      return NextResponse.json({ error: "Invalid doc decision payload" }, { status: 400 });
    }
    const decision = m[1] === "approve" ? "VERIFIED" : "REJECTED";
    const docId = m[2];
    const userName = String(body.userName || "Discord staff").trim().slice(0, 80) || "Discord staff";
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";

    const rl = rateLimit(`discord-inbound:doc:${docId}`, 10, 60 * 1000);
    if (!rl.ok) return tooManyRequests("Rate limit exceeded", rl.retryAfterSec);

    const doc = await prisma.stationDocument.findUnique({
      where: { id: docId },
      include: { station: { select: { id: true, name: true, user: { select: { name: true } } } } },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (doc.verificationStatus !== "PENDING") {
      return NextResponse.json({ ok: true, already: true, status: doc.verificationStatus });
    }

    // verifiedById: match a User by Discord display name when one exists;
    // else leave null and record the Discord name in notes + audit.
    let verifier: { id: string; role: string } | null = null;
    try {
      const match = await prisma.user.findFirst({
        where: { name: userName },
        select: { id: true, role: true },
      });
      if (match) verifier = { id: match.id, role: match.role };
    } catch {
      /* best-effort */
    }

    const updated = await prisma.stationDocument.update({
      where: { id: docId },
      data: {
        verificationStatus: decision,
        rejectionReason: decision === "REJECTED" ? reason || "Rejected via Discord (no reason given)" : null,
        verifiedById: verifier?.id || null,
        verifiedAt: new Date(),
        notes: verifier ? doc.notes : [`Discord decision by @${userName}`, doc.notes].filter(Boolean).join(" | "),
      },
    });

    await prisma.verificationLog.create({
      data: {
        stationId: doc.stationId,
        action: decision === "VERIFIED" ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED",
        performedById: verifier?.id || null,
        details: JSON.stringify({
          documentId: docId,
          documentType: doc.type,
          fileName: doc.fileName,
          newStatus: decision,
          via: "discord",
          discordUser: userName,
          rejectionReason: decision === "REJECTED" ? updated.rejectionReason : null,
        }),
      },
    });

    void recordAudit({
      actor: verifier,
      action: decision === "VERIFIED" ? "station.document_verified" : "station.document_rejected",
      entityType: "station",
      entityId: doc.stationId,
      details: { stationName: doc.station?.name, via: "discord", discordUser: userName },
    });

    await notifyStationUsers(doc.stationId, {
      type: "SYSTEM",
      title: decision === "VERIFIED" ? "Document approved" : "Document rejected",
      body: decision === "VERIFIED"
        ? `Your ${doc.type.replace(/_/g, " ")} document was approved.`
        : `Your ${doc.type.replace(/_/g, " ")} document was rejected${updated.rejectionReason ? `: ${updated.rejectionReason}` : "."}`,
      link: "/dashboard/documents",
    });

    // Sync the embed (recolor + buttons disabled) — awaited so the bot's ack
    // reflects the final state. Best-effort internally, never throws.
    const { updateStationDocEmbed } = await import("@/lib/discord-docs");
    await updateStationDocEmbed(updated, {
      stationName: doc.station?.name,
      ownerName: doc.station?.user?.name || undefined,
      reviewer: `Discord: ${userName}`,
    });

    return NextResponse.json({ ok: true, status: decision });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/**
 * Shared STAFF-reply append for both inbound events (`message` from legacy
 * threads, `channel_message` from per-ticket channels). Creates the
 * DisputeMessage row + the same customer/station/admin notifications.
 */
async function appendStaffReply(args: {
  dispute: { id: string; customerId: string; stationId: string; orderId: string } | null;
  ticket: { id: string; userId: string } | null;
  authorName: string;
  content: string;
}) {
  const { dispute, ticket, authorName, content } = args;
  if (ticket) {
    const message = await prisma.disputeMessage.create({
      data: {
        ticketId: ticket.id,
        authorRole: "STAFF",
        authorName,
        content,
      },
    });
    // Notify the ticket creator and every admin that support replied.
    await createNotification({
      userId: ticket.userId,
      type: "SUPPORT",
      title: "Support replied",
      body: "AquaLink support replied to your issue report.",
      link: `/support/${ticket.id}`,
    });
    await notifyAllAdmins({
      type: "SUPPORT",
      title: "Support replied to ticket",
      body: `AquaLink support replied to a support ticket.`,
      link: `/admin/support`,
    });
    return NextResponse.json({ success: true, data: message });
  }

  // Dispute branch (dispute is non-null here).
  const message = await prisma.disputeMessage.create({
    data: {
      disputeId: dispute!.id,
      authorRole: "STAFF",
      authorName,
      content,
    },
  });

  // Notify the customer, the station and every admin that support replied.
  await createNotification({
    userId: dispute!.customerId,
    type: "DISPUTE",
    title: "Support replied",
    body: `AquaLink support replied to your issue report on order #${dispute!.orderId.slice(0, 8)}.`,
    link: `/orders/${dispute!.orderId}`,
  });
  await notifyStationUsers(dispute!.stationId, {
    type: "DISPUTE",
    title: "Support replied to dispute",
    body: `AquaLink support replied to the dispute on order #${dispute!.orderId.slice(0, 8)}.`,
    link: "/dashboard/disputes",
  });
  await notifyAllAdmins({
    type: "DISPUTE",
    title: "Support replied to dispute",
    body: `AquaLink support replied to the dispute on order #${dispute!.orderId.slice(0, 8)}.`,
    link: "/admin/disputes",
  });

  return NextResponse.json({ success: true, data: message });
}

// GET: disabled — nothing to expose.
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
