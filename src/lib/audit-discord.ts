/**
 * Audit-trail live delivery to Discord (Phase 2 of the owner "Audit trail +
 * Discord audit report" request, Sep 5). Phase 1 (PR #62) writes every audit
 * event to the AuditLog table via recordAudit(); this module delivers each
 * event to the matching per-report channel under the owner's "Audit" category.
 *
 * Contract (same as recordAudit): fire-and-forget, NEVER throws out of the
 * caller, graceful no-op when Discord is unconfigured. The AuditLog table row
 * is the authoritative record — if Discord delivery fails, the row stands.
 *
 * No import cycle: this module imports botFetch from ./discord (which imports
 * prisma only, never ./audit). audit.ts lazy-imports this module (dynamic
 * import) so the static graph stays one-directional.
 */
import { botFetch } from "./discord";

/** Live channel ids in the owner's guild (ground truth, verified Sep 9). Env overrides win. */
export const DEFAULT_AUDIT_CATEGORY_ID = "1547150245241163816";
export const DEFAULT_AUDIT_CHANNELS: Record<string, string> = {
  users: "1547150246310846555", // audit-users
  stations: "1547150248428961873", // audit-stations
  admins: "1547150250039312434", // audit-admins
  orders: "1547150251377557504", // audit-orders
  payments: "1547150252791037962", // audit-payments
  disputes: "1547150254338736160", // audit-disputes
};

export type AuditChannelKey = keyof typeof DEFAULT_AUDIT_CHANNELS;

const CHANNEL_ENV_OVERRIDE: Record<AuditChannelKey, string> = {
  users: "DISCORD_AUDIT_USERS_CHANNEL_ID",
  stations: "DISCORD_AUDIT_STATIONS_CHANNEL_ID",
  admins: "DISCORD_AUDIT_ADMINS_CHANNEL_ID",
  orders: "DISCORD_AUDIT_ORDERS_CHANNEL_ID",
  payments: "DISCORD_AUDIT_PAYMENTS_CHANNEL_ID",
  disputes: "DISCORD_AUDIT_DISPUTES_CHANNEL_ID",
};

/** Resolve the channel id for a key: per-channel env override → live default. */
export function auditChannelId(key: AuditChannelKey): string {
  return process.env[CHANNEL_ENV_OVERRIDE[key]]?.trim() || DEFAULT_AUDIT_CHANNELS[key];
}

/** "Audit" category: env override wins, else the live default (informational — channels are addressed by id). */
export function getAuditCategoryId(): string {
  return process.env.DISCORD_AUDIT_CATEGORY_ID?.trim() || DEFAULT_AUDIT_CATEGORY_ID;
}

const AUDIT_CHANNEL_NAMES: Record<AuditChannelKey, string> = {
  users: "audit-users",
  stations: "audit-stations",
  admins: "audit-admins",
  orders: "audit-orders",
  payments: "audit-payments",
  disputes: "audit-disputes",
};

/* When DISCORD_AUDIT_CATEGORY_ID points at a DIFFERENT category (e.g. a test
   guild's Audit copy), the live default ids are wrong — resolve by channel
   name under the override category instead. Cached 10 min so delivery stays
   a single POST in the steady state. Untouched when no override is set. */
let nameCache: { at: number; byName: Record<string, string> } | null = null;

async function resolveChannelId(token: string, key: AuditChannelKey): Promise<string> {
  const direct = process.env[CHANNEL_ENV_OVERRIDE[key]]?.trim();
  if (direct) return direct;
  if (!process.env.DISCORD_AUDIT_CATEGORY_ID?.trim()) return DEFAULT_AUDIT_CHANNELS[key];
  // Category override path: resolve by name, cached.
  try {
    const now = Date.now();
    if (!nameCache || now - nameCache.at > 10 * 60 * 1000) {
      const guildId = process.env.DISCORD_GUILD_ID?.trim();
      if (!guildId) return DEFAULT_AUDIT_CHANNELS[key];
      const r = await botFetch(token, `/guilds/${guildId}/channels`);
      if (!r.ok || !Array.isArray(r.json)) return DEFAULT_AUDIT_CHANNELS[key];
      const category = getAuditCategoryId();
      const byName: Record<string, string> = {};
      for (const c of r.json as { id: string; name?: string; type?: number; parent_id?: string | null }[]) {
        if (c.type === 0 && c.parent_id === category && c.name) byName[c.name] = c.id;
      }
      nameCache = { at: now, byName };
    }
    return nameCache.byName[AUDIT_CHANNEL_NAMES[key]] || DEFAULT_AUDIT_CHANNELS[key];
  } catch {
    return DEFAULT_AUDIT_CHANNELS[key];
  }
}

/**
 * Map an audit action (+ entityType fallback) to its Discord channel.
 * Single choke point for routing — adjust here, everything follows.
 */
export function auditChannelFor(action: string, entityType?: string | null): AuditChannelKey {
  const a = (action || "").toLowerCase();
  const e = (entityType || "").toLowerCase();

  // Explicit action-prefix routing first.
  if (a.startsWith("user.") || a === "staff.accept") return "users";
  if (
    a.startsWith("station.") ||
    a.startsWith("staff.") ||
    a.startsWith("review.") ||
    a.startsWith("supportticket.")
  )
    return "stations";
  if (a.startsWith("order.")) return "orders";
  if (a.startsWith("payment.") || a.startsWith("payout.")) return "payments";
  if (a.startsWith("dispute.") || a.startsWith("support.")) return "disputes";

  // entityType fallback for unprefixed/legacy actions.
  if (e === "user" || e === "staff") return "users";
  if (e === "station" || e === "review") return "stations";
  if (e === "order") return "orders";
  if (e === "payment" || e === "payout") return "payments";
  if (e === "dispute" || e === "supportticket") return "disputes";

  // Fallback channel for anything unmapped (incl. ADMIN system-level) — never drop.
  return "admins";
}

/** Friendly title for the actions the owner reads most; fallback = raw action. */
const ACTION_LABELS: Record<string, string> = {
  "user.login": "User login",
  "user.login_failed": "Failed login attempt",
  "user.register": "New user registered",
  "user.delete": "User deleted",
  "staff.invite": "Staff invited",
  "staff.accept": "Staff invite accepted",
  "staff.update": "Staff updated",
  "staff.deactivate": "Staff deactivated",
  "station.create": "Station onboarded",
  "station.update": "Station updated",
  "station.approve": "Station approved",
  "station.reject": "Station rejected",
  "station.payout_settings": "Payout settings changed",
  "review.create": "New review",
  "order.create": "Order placed",
  "order.status_change": "Order status changed",
  "order.delivery_confirm": "Delivery confirmed",
  "order.driver_assign": "Driver assigned",
  "order.delivery_reorder": "Delivery route reordered",
  "payment.paid": "Payment received",
  "payment.failed": "Payment failed",
  "payment.refunded": "Payment refunded",
  "payout.prepare": "Payout batch prepared",
  "payout.approve": "Payout approved",
  "payout.process": "Payout processing",
  "payout.paid": "Payout paid",
  "payout.failed": "Payout failed",
  "dispute.create": "Dispute opened",
  "dispute.reply": "Dispute reply",
  "dispute.resolve": "Dispute resolved",
  "dispute.close": "Dispute closed",
  "support.reply": "Support reply",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action.toLowerCase()] || action;
}

/** Embed color by kind: create/paid = green, approve/update = blurple, fail/delete/reject = red, pending = amber. */
function actionColor(action: string): number {
  const a = action.toLowerCase();
  if (
    a.includes("fail") ||
    a.includes("reject") ||
    a.endsWith(".delete") ||
    a.includes("delete") ||
    a === "user.login_failed"
  )
    return 0xed4245; // red
  if (
    a === "payment.paid" ||
    a === "payout.paid" ||
    a.includes("create") ||
    a.includes("register") ||
    a.includes("accept") ||
    a.includes("approve") && a.startsWith("station.")
  )
    return 0x57f287; // green
  if (a.includes("approve") || a.includes("resolve") || a.includes("confirm") || a.includes("update"))
    return 0x5865f2; // blurple
  if (a.includes("process") || a.includes("prepare") || a.includes("pending") || a.includes("status_change"))
    return 0xfee75c; // amber
  return 0x5865f2; // default blurple
}

export interface AuditDiscordEntry {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | string | null;
  createdAt?: Date | string | number | null;
}

function phTime(when?: Date | string | number | null): { text: string; date: Date } {
  let d: Date;
  try {
    d = when ? new Date(when) : new Date();
    if (Number.isNaN(d.getTime())) d = new Date();
  } catch {
    d = new Date();
  }
  const text = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(d);
  return { text: `${text} PHT`, date: d };
}

/** Flatten details to a short human line; never dump full JSON. */
function detailsLine(details?: Record<string, unknown> | string | null): string {
  if (!details) return "";
  let obj: Record<string, unknown> | null = null;
  if (typeof details === "string") {
    try {
      obj = JSON.parse(details) as Record<string, unknown>;
    } catch {
      return details.length > 300 ? details.slice(0, 300) + "…" : details;
    }
  } else if (typeof details === "object") {
    obj = details;
  }
  if (!obj) return "";
  const keep = ["stationName", "stationId", "status", "rating", "orderId", "category", "type", "mode", "amount", "authorRole", "reason"];
  const parts: string[] = [];
  for (const k of keep) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") parts.push(`${k}: ${String(v)}`);
  }
  const s = parts.join(" · ");
  return s.length > 300 ? s.slice(0, 300) + "…" : s;
}

/* ── Rate-limit guard: per-channel min interval, drop bursts ─────────────── */
/* Our volume is tiny (tens of events/hour), but two audit events can land in
   the same tick (e.g. dispute.create + support channel post). A short
   per-channel min-interval coalesces those without hammering Discord; dropped
   events are logged, never retried — the table row is the record. */

const MIN_INTERVAL_MS = 1200;
const lastSentAt: Record<string, number> = {};

function channelReady(channelId: string): boolean {
  const now = Date.now();
  if (now - (lastSentAt[channelId] || 0) < MIN_INTERVAL_MS) return false;
  lastSentAt[channelId] = now;
  return true;
}

/**
 * Deliver one audit event to its Discord channel as an embed.
 * Fire-and-forget: call with `void`. NEVER throws; no-op when the bot token
 * is missing. Slow Discord responses never block app requests (async, and the
 * caller already returned — recordAudit itself is always called with `void`).
 */
export async function deliverAuditToDiscord(entry: AuditDiscordEntry): Promise<void> {
  try {
    const token = process.env.DISCORD_BOT_TOKEN?.trim();
    if (!token) return;
    const action = entry.action || "unknown";
    const key = auditChannelFor(action, entry.entityType);
    const channelId = await resolveChannelId(token, key);
    if (!channelId) return;

    if (!channelReady(channelId)) {
      console.warn("[audit-discord] coalesced burst event", action);
      return;
    }

    const { text: ph, date } = phTime(entry.createdAt);
    const actor = entry.actorRole === "SYSTEM" || !entry.actorRole
      ? "System"
      : `${entry.actorRole}${entry.actorId ? ` (${String(entry.actorId).slice(0, 8)}…)` : ""}`;
    const entity = entry.entityType
      ? `${entry.entityType}${entry.entityId ? ` \`${String(entry.entityId).slice(0, 18)}\`` : ""}`
      : "";
    const extra = detailsLine(entry.details);
    const lines = [`**Actor:** ${actor}`];
    if (entity) lines.push(`**Entity:** ${entity}`);
    if (extra) lines.push(extra);
    const description = lines.join("\n").slice(0, 1500);

    const res = await botFetch(token, `/channels/${channelId}/messages`, {
      method: "POST",
      body: {
        embeds: [
          {
            title: `🧾 ${actionLabel(action)}`,
            description,
            color: actionColor(action),
            footer: { text: `AquaLink audit · ${ph}` },
            timestamp: date.toISOString(),
          },
        ],
      },
    });
    if (!res.ok) console.warn("[audit-discord] POST failed", res.status, action);
  } catch (e) {
    console.warn("[audit-discord] delivery failed", (e as Error).message);
  }
}
