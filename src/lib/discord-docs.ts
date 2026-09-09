/**
 * Station document review via Discord (owner request, Sep 9).
 *
 * When a station uploads a compliance document the app pushes a review embed
 * with Approve/Reject buttons into a dedicated `station-docs` Discord channel,
 * so staff can approve/reject right from Discord — the same decision can still
 * be made in-app (POST /api/admin/verification/review). Status reflects in
 * real time in both places:
 *
 *   upload -> pushStationDocEmbed (app -> Discord, buttons live)
 *   in-app decision -> updateStationDocEmbed (app -> Discord embed edit)
 *   Discord button -> bot POSTs `doc_decision` -> /api/webhooks/discord
 *     (Discord -> app DB) -> updateStationDocEmbed (embed edit, buttons off)
 *
 * Contract (same as ./discord + ./audit-discord): fire-and-forget, NEVER
 * throws out of the caller, graceful no-op when Discord is unconfigured. The
 * StationDocument row is the authoritative record — if Discord delivery fails,
 * the row stands and the next action retries the embed edit best-effort.
 */
import prisma from "@/lib/prisma";
import { botFetch, getDiscordConfig, DEFAULT_TICKETS_CATEGORY_ID } from "./discord";

/** Fallback channel: audit-stations (owner's guild, verified Sep 9). Env override wins. */
export const DEFAULT_DOCS_CHANNEL_ID = "1547150248428961873";

export function docsChannelId(): string {
  return process.env.DISCORD_DOCS_CHANNEL_ID?.trim() || DEFAULT_DOCS_CHANNEL_ID;
}

/** Button customIds — the bot matches the `doc_` prefix and forwards. */
export function docApproveId(docId: string): string {
  return `doc_approve:${docId}`;
}
export function docRejectId(docId: string): string {
  return `doc_reject:${docId}`;
}
export const DOC_CUSTOM_ID_RE = /^doc_(approve|reject):([A-Za-z0-9]+)$/;

// Embed colors: amber PENDING / green VERIFIED / red REJECTED.
export const DOC_COLOR_PENDING = 0xfee75c;
export const DOC_COLOR_VERIFIED = 0x57f287;
export const DOC_COLOR_REJECTED = 0xed4245;

function phTime(when?: Date | string | number | null): string {
  let d: Date;
  try {
    d = when ? new Date(when) : new Date();
    if (Number.isNaN(d.getTime())) d = new Date();
  } catch {
    d = new Date();
  }
  return (
    new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d) + " PHT"
  );
}

function docLabel(type: string): string {
  return (type || "document").replace(/_/g, " ");
}

interface DocEmbedInput {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  verificationStatus: string;
  rejectionReason?: string | null;
  uploadedAt: Date | string | number;
}

function buildDocEmbed(
  doc: DocEmbedInput,
  stationName: string,
  ownerName: string,
  opts: { reviewer?: string } = {}
): { embeds: unknown[]; components: unknown[] } {
  const status = doc.verificationStatus || "PENDING";
  const color =
    status === "VERIFIED"
      ? DOC_COLOR_VERIFIED
      : status === "REJECTED"
        ? DOC_COLOR_REJECTED
        : DOC_COLOR_PENDING;
  const lines = [
    `**Station:** ${stationName || "(unknown station)"}`,
    `**Owner:** ${ownerName || "(unknown owner)"}`,
    `**Type:** ${docLabel(doc.type)}`,
    `**File:** ${doc.fileName || "(unnamed)"}`,
    doc.fileUrl ? `**Link:** ${doc.fileUrl}` : "",
    `**Status:** ${status}`,
  ];
  if (status === "REJECTED" && doc.rejectionReason) {
    lines.push(`**Reason:** ${doc.rejectionReason}`);
  }
  if (opts.reviewer) lines.push(`**Reviewed by:** ${opts.reviewer}`);
  const decided = status === "VERIFIED" || status === "REJECTED";
  return {
    embeds: [
      {
        title: `📄 Water station document — ${docLabel(doc.type)}`,
        description: lines.filter(Boolean).join("\n").slice(0, 2000),
        color,
        footer: {
          text: decided && opts.reviewer
            ? `Reviewed by ${opts.reviewer}`
            : `Uploaded ${phTime(doc.uploadedAt)}`,
        },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "✅ Approve",
            custom_id: docApproveId(doc.id),
            disabled: decided,
          },
          {
            type: 2,
            style: 4,
            label: "❌ Reject",
            custom_id: docRejectId(doc.id),
            disabled: decided,
          },
        ],
      },
    ],
  };
}

/**
 * Find-or-create the `station-docs` review channel. When DISCORD_DOCS_CHANNEL_ID
 * is set (or the fallback id resolves) the channel is used as-is; otherwise a
 * `station-docs` channel is created under the tickets category and cached.
 * Returns null when Discord is unconfigured. Never throws.
 */
let docsChannelCache: string | null = null;

export async function ensureStationDocsChannel(): Promise<string | null> {
  try {
    const cfg = getDiscordConfig();
    if (!cfg?.botToken || !cfg.guildId) {
      // No bot token/guild: only usable when an explicit channel id override
      // exists — nothing to create, just return the fallback id.
      return process.env.DISCORD_DOCS_CHANNEL_ID?.trim() || DEFAULT_DOCS_CHANNEL_ID;
    }
    if (docsChannelCache) return docsChannelCache;
    // Explicit override or live fallback: trust the id, no API call.
    if (process.env.DISCORD_DOCS_CHANNEL_ID?.trim() || DEFAULT_DOCS_CHANNEL_ID) {
      docsChannelCache = process.env.DISCORD_DOCS_CHANNEL_ID?.trim() || DEFAULT_DOCS_CHANNEL_ID;
      // Verify it exists (cheap GET); on failure fall through to create.
      try {
        const check = await botFetch(cfg.botToken, `/channels/${docsChannelCache}`);
        if (check.ok) return docsChannelCache;
      } catch {
        /* fall through to create */
      }
      docsChannelCache = null;
    }
    const token = cfg.botToken;
    const guildId = cfg.guildId;
    const list = await botFetch(token, `/guilds/${guildId}/channels`);
    if (list.ok && Array.isArray(list.json)) {
      const match = (list.json as { id: string; name?: string; type?: number }[]).find(
        (c) => c.type === 0 && c.name === "station-docs"
      );
      if (match) {
        docsChannelCache = match.id;
        return docsChannelCache;
      }
    } else {
      return docsChannelId();
    }
    const created = await botFetch(token, `/guilds/${guildId}/channels`, {
      method: "POST",
      body: {
        name: "station-docs",
        type: 0,
        parent_id: cfg.ticketsCategoryId || DEFAULT_TICKETS_CATEGORY_ID,
        topic: "Station document review — approve/reject with the buttons, it syncs into the app.",
      },
    });
    if (created.ok && created.json?.id) {
      docsChannelCache = String(created.json.id);
      return docsChannelCache;
    }
    console.warn("[discord-docs] create station-docs channel failed", created.status);
    return docsChannelId();
  } catch (e) {
    console.warn("[discord-docs] ensureStationDocsChannel failed", (e as Error).message);
    return null;
  }
}

/**
 * Push the review embed for a freshly uploaded doc. Persists the returned
 * channel/message ids onto the doc row (best-effort). Never throws.
 */
export async function pushStationDocEmbed(
  doc: DocEmbedInput,
  station: { name?: string | null },
  ownerName: string
): Promise<void> {
  try {
    const cfg = getDiscordConfig();
    if (!cfg?.botToken) return;
    const channelId = await ensureStationDocsChannel();
    if (!channelId) return;
    const payload = buildDocEmbed(doc, station?.name || "", ownerName || "");
    const r = await botFetch(cfg.botToken, `/channels/${channelId}/messages`, {
      method: "POST",
      body: payload,
    });
    if (!r.ok || !r.json?.id) {
      console.warn("[discord-docs] embed POST failed", r.status);
      return;
    }
    try {
      await prisma.stationDocument.updateMany({
        where: { id: doc.id, discordMessageId: null },
        data: { discordMessageId: String(r.json.id), discordChannelId: channelId },
      });
    } catch (e) {
      console.warn("[discord-docs] persist message id failed", (e as Error).message);
    }
  } catch (e) {
    console.warn("[discord-docs] pushStationDocEmbed failed", (e as Error).message);
  }
}

/**
 * PATCH the stored embed after a status change (in-app OR Discord decision):
 * recolor, append reason/reviewer, disable the buttons. Best-effort — the app
 * DB is the source of truth. Never throws.
 */
export async function updateStationDocEmbed(
  doc: {
    id: string;
    type: string;
    fileName: string;
    fileUrl: string;
    verificationStatus: string;
    rejectionReason?: string | null;
    uploadedAt: Date | string | number;
    discordMessageId?: string | null;
    discordChannelId?: string | null;
  },
  opts: { stationName?: string; ownerName?: string; reviewer?: string } = {}
): Promise<void> {
  try {
    const cfg = getDiscordConfig();
    if (!cfg?.botToken) return;
    let { discordChannelId: channelId, discordMessageId: messageId } = doc;
    if (!channelId || !messageId) {
      // Backfill lookup: not indexed, single-row fetch already done by caller —
      // just re-read the row in case the ids landed after the caller loaded it.
      try {
        const fresh = await prisma.stationDocument.findUnique({
          where: { id: doc.id },
          select: { discordChannelId: true, discordMessageId: true },
        });
        channelId = channelId || fresh?.discordChannelId || null;
        messageId = messageId || fresh?.discordMessageId || null;
      } catch {
        /* ignore */
      }
      if (!channelId || !messageId) return;
    }
    const payload = buildDocEmbed(
      {
        id: doc.id,
        type: doc.type,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        verificationStatus: doc.verificationStatus,
        rejectionReason: doc.rejectionReason ?? null,
        uploadedAt: doc.uploadedAt,
      },
      opts.stationName || "",
      opts.ownerName || "",
      { reviewer: opts.reviewer }
    );
    const r = await botFetch(cfg.botToken, `/channels/${channelId}/messages/${messageId}`, {
      method: "PATCH",
      body: payload,
    });
    if (!r.ok) console.warn("[discord-docs] embed PATCH failed", r.status);
  } catch (e) {
    console.warn("[discord-docs] updateStationDocEmbed failed", (e as Error).message);
  }
}

/**
 * Delete the stored review embed (doc deleted by the station owner while still
 * PENDING/REJECTED). Best-effort. Never throws.
 */
export async function deleteStationDocEmbed(doc: {
  discordMessageId?: string | null;
  discordChannelId?: string | null;
}): Promise<void> {
  try {
    const cfg = getDiscordConfig();
    if (!cfg?.botToken || !doc.discordChannelId || !doc.discordMessageId) return;
    const r = await botFetch(
      cfg.botToken,
      `/channels/${doc.discordChannelId}/messages/${doc.discordMessageId}`,
      { method: "DELETE" }
    );
    if (!r.ok) console.warn("[discord-docs] embed DELETE failed", r.status);
  } catch (e) {
    console.warn("[discord-docs] deleteStationDocEmbed failed", (e as Error).message);
  }
}
