/**
 * Crash telemetry → AuditLog + Discord (owner request, Sep 2026).
 *
 * Clients report uncaught errors / unhandled rejections / render-boundary
 * failures to POST /api/telemetry/crash (rate-limited, size-capped, no auth —
 * see that route for input validation). This module turns each valid report
 * into:
 *
 *   1. an AuditLog row (entityType "crash", action "app.crash") — the
 *      authoritative record; and
 *   2. a best-effort red embed pushed to a `#crash-reports` Discord channel
 *      so ops can triage crashes in the dashboard they already watch.
 *
 * Channel resolution (mirrors ./discord-docs channel handling):
 *   DISCORD_CRASH_REPORTS_CHANNEL_ID override (trusted as-is, verified with a
 *   cheap GET) → existing `#crash-reports` channel looked up via the guild
 *   channel list → create `#crash-reports` under the Tickets category.
 *   Resolved once per process and cached; null on any failure.
 *
 * Contract (same as ./audit and ./discord-docs): fire-and-forget, NEVER
 * throws out of the caller, graceful no-op when Discord is unconfigured. The
 * AuditLog row stands even if Discord delivery fails.
 */
import prisma from "@/lib/prisma";
import { botFetch, getDiscordConfig, DEFAULT_TICKETS_CATEGORY_ID } from "./discord";

/** Discord embed color — red for crashes. */
const CRASH_COLOR = 0xed4245;
const CRASH_CHANNEL_NAME = "crash-reports";
const CRASH_CHANNEL_TOPIC =
  "AquaLink app crash reports — uncaught client errors & render failures. Triage here.";
/** details JSON is compact-capped like recordAudit's safeDetails (4KB). */
const DETAILS_CAP = 4000;

export interface CrashReport {
  message: string;
  stack: string;
  route: string;
  userAgent: string;
  /** Trusted session user id when available; else the client hint (unverified). */
  userId: string | null;
  /** Session role (CUSTOMER/PROVIDER/ADMIN) when the server verified a session. */
  role?: string | null;
  /** When the client observed the crash (ISO string), else server-fills now. */
  at?: string | null;
}

// ─── Channel resolution ────────────────────────────────────────────────────
// Resolved once per process (like docsChannelCache). Never throws.
let crashChannelCache: string | null = null;

export async function resolveCrashChannelId(): Promise<string | null> {
  try {
    const cfg = getDiscordConfig();
    if (!cfg?.botToken || !cfg.guildId) {
      // No bot token/guild → cannot verify or create; only an explicit
      // override is usable (webhook-only setups at least route somewhere).
      return process.env.DISCORD_CRASH_REPORTS_CHANNEL_ID?.trim() || null;
    }
    if (crashChannelCache) return crashChannelCache;

    const direct = process.env.DISCORD_CRASH_REPORTS_CHANNEL_ID?.trim();
    if (direct) {
      // Trust the override but verify cheaply; fall through on failure.
      const check = await botFetch(cfg.botToken, `/channels/${direct}`);
      if (check.ok) {
        crashChannelCache = direct;
        return direct;
      }
    }

    const list = await botFetch(cfg.botToken, `/guilds/${cfg.guildId}/channels`);
    if (list.ok && Array.isArray(list.json)) {
      const match = (list.json as { id: string; name?: string; type?: number }[]).find(
        (c) => c.type === 0 && c.name === CRASH_CHANNEL_NAME
      );
      if (match) {
        crashChannelCache = match.id;
        return match.id;
      }
    } else {
      return direct || null;
    }

    const created = await botFetch(cfg.botToken, `/guilds/${cfg.guildId}/channels`, {
      method: "POST",
      body: {
        name: CRASH_CHANNEL_NAME,
        type: 0,
        parent_id: cfg.ticketsCategoryId || DEFAULT_TICKETS_CATEGORY_ID,
        topic: CRASH_CHANNEL_TOPIC,
      },
    });
    if (created.ok && created.json?.id) {
      crashChannelCache = String(created.json.id);
      return crashChannelCache;
    }
    console.warn("[crash-reports] create #crash-reports channel failed", created.status);
    return direct || null;
  } catch (e) {
    console.warn("[crash-reports] channel resolution failed", (e as Error).message);
    return null;
  }
}

// ─── Sanitizing helpers (no HTML / raw-control-character injection) ───────
/** Strip JSON-breaking control chars (keep \n and \t); cap length. */
export function sanitizeCrashField(v: string, max: number): string {
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "").slice(0, max);
}

function compactDetails(details: Record<string, unknown>): string | undefined {
  try {
    const s = JSON.stringify(details);
    return s.length > DETAILS_CAP ? s.slice(0, DETAILS_CAP) : s;
  } catch {
    return undefined;
  }
}

function phTime(when?: string | null): { text: string; date: Date } {
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

/**
 * Push one crash report as a red embed to the crash-reports channel.
 * Fire-and-forget: call with `void`. Never throws; no-op when the bot token
 * is missing or the channel cannot be resolved.
 */
export async function pushCrashReportToDiscord(report: CrashReport): Promise<void> {
  try {
    const cfg = getDiscordConfig();
    if (!cfg?.botToken) return;
    const channelId = await resolveCrashChannelId();
    if (!channelId) return;

    const { text: ph, date } = phTime(report.at);
    const message = sanitizeCrashField(report.message || "(no message)", 900);
    const route = sanitizeCrashField(report.route || "(unknown)", 900);
    const stack = sanitizeCrashField(report.stack || "(no stack)", 900)
      // A stack trace containing ``` would terminate the embed code block
      // early and could smuggle Discord markdown — neutralize it.
      .replace(/```/g, "'");
    const ua = sanitizeCrashField(report.userAgent || "(unknown)", 500);
    const userId = report.userId ? sanitizeCrashField(report.userId, 200) : null;

    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: "📍 Route", value: route || "(unknown)", inline: false },
      { name: "💬 Message", value: message || "(no message)", inline: false },
      { name: "🧵 Stack", value: `\`\`\`\n${stack}\n\`\`\``, inline: false },
      { name: "👤 User", value: userId ? `\`${userId}\`` : "anonymous", inline: true },
      { name: "🕐 When", value: ph, inline: true },
    ];
    if (ua) fields.push({ name: "📱 User agent", value: ua, inline: false });

    const res = await botFetch(cfg.botToken, `/channels/${channelId}/messages`, {
      method: "POST",
      body: {
        embeds: [
          {
            title: "💥 App crash",
            color: CRASH_COLOR,
            description: "A client-side error was reported by the AquaLink app.",
            fields,
            footer: { text: `AquaLink telemetry · ${ph}` },
            timestamp: date.toISOString(),
          },
        ],
      },
    });
    if (!res.ok) console.warn("[crash-reports] embed POST failed", res.status);
  } catch (e) {
    console.warn("[crash-reports] delivery failed", (e as Error).message);
  }
}

/**
 * Record one crash report: AuditLog row (authoritative) + best-effort Discord
 * embed. Call with `void` from the API route — the client response never
 * waits on this (fire-and-forget on a long-lived `next start` process, same
 * convention as recordAudit). Never throws.
 */
export async function recordCrashReport(report: CrashReport): Promise<void> {
  try {
    const details = compactDetails({
      message: report.message,
      stack: report.stack,
      route: report.route,
      userAgent: report.userAgent,
      userId: report.userId,
      clientAt: report.at ?? null,
    });
    await prisma.auditLog.create({
      data: {
        // actorId is best-effort: session user id when the server could verify
        // one, else the client hint (never treated as an authenticated actor).
        actorId: report.userId,
        actorRole: report.role || "SYSTEM",
        action: "app.crash",
        entityType: "crash",
        entityId: null,
        details,
      },
    });
  } catch (err) {
    // The audit row must never break the request path.
    console.warn("[crash-reports] audit write failed", err);
  }
  try {
    await pushCrashReportToDiscord(report);
  } catch (e) {
    console.warn("[crash-reports] discord push failed", (e as Error).message);
  }
}