/**
 * Discord two-way support bridge (feature, Aug 18; per-ticket channels, Sep 9).
 *
 * Phase 2a (owner request, Sep 5): ONE bot-created Discord channel per ticket /
 * dispute instead of threads. When a SupportTicket or Dispute is created the app
 * ensures a `ticket-<id>` channel exists under the "Tickets" category and posts
 * the initial message there; app replies are pushed into it by the bot, Discord
 * replies typed by support staff come back via the `channel_message` webhook
 * event, and resolve/close moves the channel to the "Closed Tickets" archive
 * category. Everything is idempotent (lookup by channel name before create) and
 * a graceful no-op when Discord is not configured.
 *
 * Legacy path (kept for records created before Phase 2a): entities with no
 * discordChannelId still use the channel-webhook + bot-thread flow from Aug 18:
 *
 *   1. PUSH (app -> Discord): a channel webhook (DISCORD_WEBHOOK_URL) posts the
 *      initial ticket (with a `[ticket:<disputeId>]` marker) and, once the bot
 *      has bound a thread, posts customer/station follow-up messages into it.
 *   2. BOT (scripts/discord-bot.mjs): a long-lived process that sees the
 *      `[ticket:...]` marker, spins it into a private/public thread, and POSTs a
 *      `bind` event to /api/webhooks/discord so the app stores discordThreadId.
 *      It also forwards staff replies typed in `ticket-*` channels as
 *      `channel_message` events.
 *   3. INBOUND (POST /api/webhooks/discord): Discord replies typed by support
 *      staff are forwarded here by the bot as a `message` (legacy thread) or
 *      `channel_message` (per-ticket channel) event and appended to the dispute
 *      as authorRole=STAFF DisputeMessage rows, so the customer, the station
 *      and admins all see them in the app.
 *
 * The whole feature is a graceful no-op when Discord is not configured: every
 * helper short-circuits when the relevant credentials are absent (or the
 * incoming secret is unset for the inbound path). Nothing breaks if the owner
 * has not set the secrets yet, and no helper ever throws — all failures are
 * swallowed and logged so requests never block on Discord.
 */
import prisma from "@/lib/prisma";

/** Regex that marks the app's initial ticket message so the bot can thread it. */
export const TICKET_MARKER_RE = /\[ticket:([A-Za-z0-9]+)\]/;

export interface DiscordConfig {
  webhookUrl: string;
  botToken?: string;
  guildId?: string;
  ticketsCategoryId?: string;
  closedCategoryId?: string;
  webhookSecret?: string;
  supportChannelId?: string;
  appUrl: string;
  /** Discord user id of the app's bot — inbound replies from it are ignored. */
  selfUserId?: string;
}

/** Fallback category ids (owner's guild, created live). Env overrides win. */
export const DEFAULT_TICKETS_CATEGORY_ID = "1547151000819867708";
export const DEFAULT_CLOSED_CATEGORY_ID = "1547151002317094993";

export function getDiscordConfig(): DiscordConfig | null {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  // The webhook is the source of truth for whether the feature is on; without
  // it there is nowhere to push. The secret/config for the other pieces may be
  // unset and the respective path simply stays disabled.
  if (!webhookUrl) return null;
  return {
    webhookUrl,
    botToken: process.env.DISCORD_BOT_TOKEN?.trim() || undefined,
    guildId: process.env.DISCORD_GUILD_ID?.trim() || undefined,
    ticketsCategoryId:
      process.env.DISCORD_TICKETS_CATEGORY_ID?.trim() || DEFAULT_TICKETS_CATEGORY_ID,
    closedCategoryId:
      process.env.DISCORD_CLOSED_CATEGORY_ID?.trim() || DEFAULT_CLOSED_CATEGORY_ID,
    webhookSecret: process.env.DISCORD_WEBHOOK_SECRET?.trim() || undefined,
    supportChannelId: process.env.DISCORD_SUPPORT_CHANNEL_ID?.trim() || undefined,
    appUrl:
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.NEXTAUTH_URL?.trim() ||
      "",
    selfUserId: process.env.DISCORD_BOT_SELF_ID?.trim() || undefined,
  };
}

export function isDiscordEnabled(): boolean {
  return !!getDiscordConfig();
}

/** Constant-time comparison for the inbound shared secret. */
export function discordSecretOk(supplied: string | null | undefined): boolean {
  const cfg = getDiscordConfig();
  const secret = cfg?.webhookSecret;
  if (!secret) return false;
  const a = Buffer.from(String(supplied ?? ""));
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function postToWebhook(url: string, payload: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn("[discord] webhook POST failed", res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[discord] webhook POST error", (e as Error).message);
    return false;
  }
}

/** Human label for each message author role, shown in the Discord thread. */
const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: "Customer",
  STATION: "Station",
  ADMIN: "AquaLink Admin",
  STAFF: "AquaLink Support",
};

/**
 * Initial ticket body posted to the support channel (before a thread exists).
 * Drives BOTH order-bound disputes and general support tickets: the order link
 * block is only rendered when an order is actually linked (Aug 19).
 */
function ticketContent(issue: {
  id: string;
  orderId?: string | null;
  type: string;
  description: string;
  reporterName: string;
  appUrl: string;
  reporterLabel?: string;
}): string {
  const type = (issue.type || "OTHER").replace(/_/g, " ");
  const reporter = issue.reporterLabel || "Customer";
  const lines = [
    `[ticket:${issue.id}] **New issue report — ${type}**`,
    `**Category:** ${type}`,
    `**${reporter}:** ${issue.reporterName || "AquaLink user"}`,
    ``,
    `${issue.description || "(no details)"}`,
  ];
  // Optional order linkage — only rendered when an order is actually provided.
  if (issue.orderId) {
    lines.push(``, `Order link: ${issue.appUrl}/orders/${issue.orderId}`);
  }
  return lines.join("\n");
}

/**
 * Push the initial ticket when a Dispute is created (order-bound). Fire-and-
 * forget: never blocks the request; failures are swallowed and logged.
 */
export async function pushDisputeCreated(
  dispute: {
    id: string;
    orderId: string;
    type: string;
    description: string;
  },
  opts: { customerName?: string }
): Promise<void> {
  return pushSupportTicketCreated(
    {
      id: dispute.id,
      orderId: dispute.orderId,
      category: dispute.type,
      description: dispute.description,
    },
    { reporterName: opts.customerName, reporterLabel: "Customer" }
  );
}

/**
 * Push the initial ticket for a general support ticket (order optional).
 * Fire-and-forget; a no-op when Discord is not configured (graceful).
 */
export async function pushSupportTicketCreated(
  ticket: {
    id: string;
    orderId?: string | null;
    category: string;
    description: string;
  },
  opts: { reporterName?: string; reporterLabel?: string }
): Promise<void> {
  const cfg = getDiscordConfig();
  if (!cfg) return;
  const content = ticketContent({
    id: ticket.id,
    orderId: ticket.orderId || null,
    type: ticket.category,
    description: ticket.description,
    reporterName: opts.reporterName || "",
    reporterLabel: opts.reporterLabel,
    appUrl: cfg.appUrl,
  });
  // No thread yet: post to the channel; the bot threads it and binds it back.
  await postToWebhook(cfg.webhookUrl, { content });
}

/**
 * Push a customer/station message into the dispute's Discord destination:
 * the per-ticket channel when one exists (Phase 2a, bot token), else the
 * legacy bound thread (webhook). If the channel post fails (channel deleted,
 * perms), falls through to the legacy thread when bound. If neither
 * destination exists, the message is skipped (it is still visible in-app; a
 * real Discord comes later). Fire-and-forget.
 */
export async function pushDisputeMessage(
  dispute: { id: string; discordThreadId: string | null; discordChannelId?: string | null },
  message: { authorRole: string; authorName: string; content: string }
): Promise<void> {
  const cfg = getDiscordConfig();
  if (!cfg) return;
  // Phase 2a path first.
  if (dispute.discordChannelId) {
    const sent = await pushChannelMessage(
      { discordChannelId: dispute.discordChannelId },
      message
    );
    if (sent) return;
  }
  // Legacy fallback: entities created before Phase 2a have no channel id.
  if (!dispute.discordThreadId) return;
  const label = ROLE_LABEL[message.authorRole] || message.authorRole;
  const content = `**[${label}] ${message.authorName || "Unknown"}:**\n${
    message.content.length > 1800
      ? message.content.slice(0, 1800) + "..."
      : message.content
  }`;
  await postToWebhook(`${cfg.webhookUrl}?thread_id=${dispute.discordThreadId}`, {
    content,
  });
}

/**
 * Push a short status-change note (RESOLVED / CLOSED) into a ticket's bound
 * Discord destination: the per-ticket channel when one exists (Phase 2a),
 * else the legacy bound thread. Fire-and-forget; no-op when Discord is
 * unconfigured or neither destination exists yet. Used by the status-update
 * (close/resolve) endpoint so support staff see in Discord that a ticket
 * moved state.
 */
export async function pushTicketStatusChange(
  ticket: { id: string; discordThreadId: string | null; discordChannelId?: string | null },
  status: string,
  actorName: string
): Promise<void> {
  const cfg = getDiscordConfig();
  if (!cfg) return;
  const sent = await tryPostChannelMessage(ticket.discordChannelId ?? null, statusContent(status, actorName));
  if (sent) return;
  // Legacy fallback: entities created before Phase 2a have no channel id.
  if (!ticket.discordThreadId) return;
  await postToWebhook(`${cfg.webhookUrl}?thread_id=${ticket.discordThreadId}`, {
    content: statusContent(status, actorName),
  });
}

function statusContent(status: string, actorName: string): string {
  const label = status === "CLOSED" ? "Closed" : status === "RESOLVED" ? "Resolved" : status;
  return `✅ Ticket marked **${label}** by ${actorName || "AquaLink user"}.`;
}

/* ── Phase 2a: one bot-created channel per ticket/dispute ──────────────── */

const DISCORD_API = "https://discord.com/api/v10";

/** Channel name for an entity — idempotency key for the whole feature. */
export function ticketChannelName(id: string): string {
  return `ticket-${id}`;
}

interface DiscordChannel {
  id: string;
  name?: string;
  type?: number;
  parent_id?: string | null;
}

async function botFetch(
  token: string,
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<{ ok: boolean; status: number; json: any }> {
  try {
    const res = await fetch(`${DISCORD_API}${path}`, {
      method: options.method || "GET",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    let json: any = null;
    try {
      json = res.status === 204 ? null : await res.json();
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    console.warn("[discord] bot REST error", (e as Error).message);
    return { ok: false, status: 0, json: null };
  }
}

/** List all guild channels (used for idempotent existence checks). */
async function listGuildChannels(token: string, guildId: string): Promise<DiscordChannel[] | null> {
  const r = await botFetch(token, `/guilds/${guildId}/channels`);
  if (!r.ok || !Array.isArray(r.json)) {
    console.warn("[discord] list guild channels failed", r.status);
    return null;
  }
  return r.json as DiscordChannel[];
}

/**
 * Post a message into a per-ticket channel via the BOT token (the webhook
 * token cannot address arbitrary channels). Returns true when posted.
 * Never throws — graceful no-op on any failure.
 */
async function tryPostChannelMessage(channelId: string | null | undefined, content: string): Promise<boolean> {
  const cfg = getDiscordConfig();
  if (!cfg?.botToken || !channelId) return false;
  const r = await botFetch(cfg.botToken, `/channels/${channelId}/messages`, {
    method: "POST",
    body: { content: content.length > 1900 ? content.slice(0, 1900) + "…" : content },
  });
  if (!r.ok) console.warn("[discord] bot channel POST failed", r.status);
  return r.ok;
}

/**
 * Ensure a `ticket-<id>` channel exists under the Tickets category and post
 * the initial ticket message into it. Idempotent: if a channel with that name
 * already exists (bot restart, retry), it is reused — never duplicated.
 *
 * Fire-and-forget: returns early (no-op) when Discord config/bot token/guild
 * is missing, and NEVER throws — a failed create/post just means no channel
 * (the app record is authoritative). Call with `void` after the DB write,
 * same convention as recordAudit.
 *
 * `kind` selects which table the channel id is persisted to.
 */
export async function ensureTicketChannel(
  kind: "ticket" | "dispute",
  entity: {
    id: string;
    discordChannelId?: string | null;
    orderId?: string | null;
    category?: string;
    type?: string;
    description: string;
  },
  opts: { reporterName?: string; reporterLabel?: string } = {}
): Promise<void> {
  try {
    const cfg = getDiscordConfig();
    if (!cfg || !cfg.botToken || !cfg.guildId) return;
    const name = ticketChannelName(entity.id);

    // Reuse the stored channel id when present (fast path, no API call).
    let channelId: string | null = entity.discordChannelId || null;

    // Otherwise look it up by name (idempotent across restarts/retries).
    if (!channelId) {
      const channels = await listGuildChannels(cfg.botToken, cfg.guildId);
      if (!channels) return; // can't verify — bail rather than risk a duplicate
      const match = channels.find((c) => c.type === 0 && c.name === name);
      if (match) channelId = match.id;
    }

    // Create under the Tickets category when missing.
    if (!channelId) {
      const r = await botFetch(cfg.botToken, `/guilds/${cfg.guildId}/channels`, {
        method: "POST",
        body: {
          name,
          type: 0,
          parent_id: cfg.ticketsCategoryId,
          topic: `[ticket:${entity.id}] AquaLink support ticket — reply here, it syncs into the app.`,
        },
      });
      if (!r.ok || !r.json?.id) {
        console.warn("[discord] create ticket channel failed", r.status);
        return;
      }
      channelId = String(r.json.id);
    }

    // Persist the channel id (idempotent write — same value on retries).
    try {
      if (kind === "ticket") {
        await prisma.supportTicket.updateMany({
          where: { id: entity.id, discordChannelId: null },
          data: { discordChannelId: channelId },
        });
      } else {
        await prisma.dispute.updateMany({
          where: { id: entity.id, discordChannelId: null },
          data: { discordChannelId: channelId },
        });
      }
    } catch (e) {
      console.warn("[discord] persist channel id failed", (e as Error).message);
    }

    // Initial message: same body as the legacy flow, marker kept for redundancy.
    const content = ticketContent({
      id: entity.id,
      orderId: entity.orderId ?? null,
      type: entity.category ?? entity.type ?? "OTHER",
      description: entity.description,
      reporterName: opts.reporterName || "",
      reporterLabel: opts.reporterLabel,
      appUrl: cfg.appUrl,
    });
    await tryPostChannelMessage(channelId, content);
  } catch (e) {
    console.warn("[discord] ensureTicketChannel failed", (e as Error).message);
  }
}

/**
 * Post an app-side reply into the entity's per-ticket channel (bot token).
 * Returns true when posted so callers can fall back to the legacy thread path.
 * Never throws.
 */
export async function pushChannelMessage(
  entity: { discordChannelId?: string | null },
  message: { authorRole: string; authorName: string; content: string }
): Promise<boolean> {
  if (!entity.discordChannelId) return false;
  const label = ROLE_LABEL[message.authorRole] || message.authorRole;
  const content = `**[${label}] ${message.authorName || "Unknown"}:**\n${
    message.content.length > 1800 ? message.content.slice(0, 1800) + "..." : message.content
  }`;
  try {
    return await tryPostChannelMessage(entity.discordChannelId, content);
  } catch {
    return false;
  }
}

/**
 * Archive a ticket/dispute's channel: move it to the Closed Tickets category
 * and set the topic to `Closed`. Leave the channel open; never delete.
 * Fire-and-forget, never throws. No-op when no channel id is stored.
 */
export async function archiveTicketChannel(channelId: string | null | undefined): Promise<void> {
  try {
    const cfg = getDiscordConfig();
    if (!cfg?.botToken || !channelId) return;
    const r = await botFetch(cfg.botToken, `/channels/${channelId}`, {
      method: "PATCH",
      body: { parent_id: cfg.closedCategoryId, topic: "Closed" },
    });
    if (!r.ok) console.warn("[discord] archive channel failed", r.status);
  } catch (e) {
    console.warn("[discord] archiveTicketChannel failed", (e as Error).message);
  }
}
