/**
 * Discord two-way support bridge (feature, Aug 18).
 *
 * Mirrors a dispute into a Discord support thread so support staff can reply
 * from Discord, and syncs customer/station replies from the app into that
 * thread. Three moving pieces, all driven from this config:
 *
 *   1. PUSH (app -> Discord): a channel webhook (DISCORD_WEBHOOK_URL) posts the
 *      initial ticket (with a `[ticket:<disputeId>]` marker) and, once the bot
 *      has bound a thread, posts customer/station follow-up messages into it.
 *   2. BOT (scripts/discord-bot.mjs): a long-lived process that sees the
 *      `[ticket:...]` marker, spins it into a private/public thread, and POSTs a
 *      `bind` event to /api/webhooks/discord so the app stores discordThreadId.
 *   3. INBOUND (POST /api/webhooks/discord): Discord replies typed by support
 *      staff are forwarded here by the bot as a `message` event and appended to
 *      the dispute as authorRole=STAFF DisputeMessage rows, so the customer,
 *      the station and admins all see them in the app.
 *
 * The whole feature is a graceful no-op when Discord is not configured: every
 * helper short-circuits when DISCORD_WEBHOOK_URL is absent (or the incoming
 * secret is unset for the inbound path). Nothing breaks if the owner has not
 * set the secrets yet.
 */
import prisma from "@/lib/prisma";

/** Regex that marks the app's initial ticket message so the bot can thread it. */
export const TICKET_MARKER_RE = /\[ticket:([A-Za-z0-9]+)\]/;

export interface DiscordConfig {
  webhookUrl: string;
  botToken?: string;
  webhookSecret?: string;
  supportChannelId?: string;
  appUrl: string;
  /** Discord user id of the app's bot — inbound replies from it are ignored. */
  selfUserId?: string;
}

export function getDiscordConfig(): DiscordConfig | null {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  // The webhook is the source of truth for whether the feature is on; without
  // it there is nowhere to push. The secret/config for the other pieces may be
  // unset and the respective path simply stays disabled.
  if (!webhookUrl) return null;
  return {
    webhookUrl,
    botToken: process.env.DISCORD_BOT_TOKEN?.trim() || undefined,
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

/** Initial ticket body posted to the support channel (before a thread exists). */
function ticketContent(dispute: {
  id: string;
  orderId: string;
  type: string;
  description: string;
  customerName: string;
  appUrl: string;
}): string {
  const orderShort = dispute.orderId.slice(0, 8);
  const link = `${dispute.appUrl}/orders/${dispute.orderId}`;
  const type = (dispute.type || "OTHER").replace(/_/g, " ");
  return [
    `[ticket:${dispute.id}] **New issue report — Order #${orderShort}**`,
    `**Type:** ${type}`,
    `**Customer:** ${dispute.customerName || "AquaLink customer"}`,
    ``,
    `${dispute.description || "(no details)"}`,
    ``,
    `Order link: ${link}`,
  ].join("\n");
}

/**
 * Push the initial ticket when a dispute is created. Fire-and-forget: never
 * blocks the request; failures are swallowed and logged.
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
  const cfg = getDiscordConfig();
  if (!cfg) return;
  const content = ticketContent({
    id: dispute.id,
    orderId: dispute.orderId,
    type: dispute.type,
    description: dispute.description,
    customerName: opts.customerName || "",
    appUrl: cfg.appUrl,
  });
  // No thread yet: post to the channel; the bot threads it and binds it back.
  await postToWebhook(cfg.webhookUrl, { content });
}

/**
 * Push a customer/station message into the dispute's bound Discord thread.
 * If the thread has not been bound yet, the message is skipped (it is still
 * visible in-app; a real Discord comes later). Fire-and-forget.
 */
export async function pushDisputeMessage(
  dispute: { id: string; discordThreadId: string | null },
  message: { authorRole: string; authorName: string; content: string }
): Promise<void> {
  const cfg = getDiscordConfig();
  if (!cfg || !dispute.discordThreadId) return;
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
