import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { recordCrashReport, sanitizeCrashField, type CrashReport } from "@/lib/crash-reports";

/**
 * POST /api/telemetry/crash — client crash telemetry (owner request, Sep 2026).
 *
 * No auth required: uncaught errors / unhandled rejections / render-boundary
 * failures are reported by anonymous visitors too. Session is resolved when
 * present (best-effort) so logged-in reports are attributed to the real user.
 *
 * Guardrails (abuse-resistant by design):
 *   - Rate-limited per IP AND per user (~10/min each; user key = session id
 *     when verified, else the client hint).
 *   - Body size-capped: per-field truncation at a few KB each, whole body over
 *     64 KB rejected with 413, invalid JSON → 400.
 *   - All fields control-char-stripped before logging/embedding (no raw
 *     \u0000-style JSON breakage or markup injection into Discord).
 *   - Downstream (AuditLog row + Discord embed) is FIRE-AND-FORGET: the client
 *     call gets its 201 immediately and telemetry never perturbs the user path.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024; // whole-body cap (reject, not just truncate)
const CAPS = {
  message: 2000,
  stack: 8000,
  route: 1000,
  userAgent: 500,
  userId: 200,
  at: 64,
} as const;
const RATE_PER_MIN = 10;
const RATE_WINDOW_MS = 60 * 1000;

function cleanField(v: unknown, max: number): string {
  return typeof v === "string" ? sanitizeCrashField(v, max).trim() : "";
}

export async function POST(req: NextRequest) {
  // 1. Fast-fail oversized bodies BEFORE reading (the post-read check below is
  //    the real gate when Content-Length is absent or lies).
  try {
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload too large" }, { status: 413 });
    }
  } catch {
    /* header read cannot throw meaningfully; continue */
  }

  // 2. Best-effort session resolution — never blocks anonymous reports.
  let sessionUser: { id?: string; role?: string } | null = null;
  try {
    const session = await getServerSession(authOptions);
    const u = session?.user as { id?: string; role?: string } | undefined;
    if (u?.id) sessionUser = u;
  } catch {
    // Session infra hiccup must not drop crash reports.
  }

  // 3. Read + parse the body.
  let text: string;
  try {
    text = await req.text();
  } catch {
    return NextResponse.json({ error: "unreadable body" }, { status: 400 });
  }
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "expected a JSON object" }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  // 4. Rate limit: per-IP (authoritative for anonymous) + per-user.
  const ipRl = rateLimit(`crash:ip:${clientIp(req)}`, RATE_PER_MIN, RATE_WINDOW_MS);
  const hintUserId = cleanField(body.userId, CAPS.userId) || null;
  const userId = sessionUser?.id ?? hintUserId;
  const userRl =
    sessionUser?.id ?? hintUserId
      ? rateLimit(`crash:user:${userId}`, RATE_PER_MIN, RATE_WINDOW_MS)
      : null;
  if (!ipRl.ok || (userRl && !userRl.ok)) {
    const retryAfterSec = Math.max(ipRl.retryAfterSec, userRl?.retryAfterSec ?? 0);
    // Keep the route fast for well-behaved clients — a 429 is a soft throttle,
    // not an error the client should surface to the user.
    return tooManyRequests("Too many crash reports.", retryAfterSec);
  }

  // 5. Sanitize + cap every field (truncate, never trust raw input).
  const report: CrashReport = {
    message: cleanField(body.message, CAPS.message),
    stack: cleanField(body.stack, CAPS.stack),
    route: cleanField(body.route, CAPS.route),
    userAgent: cleanField(body.userAgent, CAPS.userAgent),
    userId,
    role: sessionUser?.role || null,
    at: cleanField(body.at, CAPS.at) || null,
  };

  // 6. Fire-and-forget: the AuditLog row + Discord embed happen after the
  //    response is on its way. The app is a single long-lived `next start`
  //    process, so the async work always completes; telemetry never blocks.
  void recordCrashReport(report);

  return NextResponse.json({ ok: true }, { status: 201 });
}