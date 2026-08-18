import { NextResponse } from "next/server";

/**
 * In-process rate limiting (security audit S-05, 2026-08-14). No dependencies.
 *
 * Token-bucket semantics: each key starts with `limit` tokens and refills at
 * `limit / windowMs` tokens per ms; a request consumes one token. This smooths
 * bursts (a client can use the whole budget immediately, then must wait for
 * refill) which is exactly the abuse profile we want for auth/OTP/write
 * endpoints.
 *
 * State is a module-level Map, so it resets on process restart — acceptable at
 * this stage: the app is a single `next start` process, a restart also clears
 * an in-progress attacker's counters, and abuse volume is low. If the app ever
 * scales to multiple instances this must move to a shared store (e.g. Redis)
 * or edge rate limiting.
 *
 * CRITICAL: only use on POST/mutation endpoints. The 25s polling GET endpoints
 * (customer dashboard, order detail, station home, station order list) must
 * NEVER be rate-limited.
 */

export interface RateLimitDecision {
  ok: boolean;
  /** Tokens left in the bucket (0 when blocked). */
  remaining: number;
  /** Seconds until the bucket has at least one free token (0 when ok). */
  retryAfterSec: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  limit: number;
  windowMs: number;
}

const buckets = new Map<string, TokenBucket>();

/** Sweep buckets idle for >2 windows so the map cannot grow without bound. */
const SWEEP_EVERY_NEW_KEYS = 1000;
let opsSinceSweep = 0;

function sweep(now: number) {
  buckets.forEach((b, key) => {
    if (now - b.lastRefill > b.windowMs * 2) buckets.delete(key);
  });
}

function refill(b: TokenBucket, now: number) {
  const ratePerMs = b.limit / b.windowMs;
  b.tokens = Math.min(b.limit, b.tokens + (now - b.lastRefill) * ratePerMs);
  b.lastRefill = now;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitDecision {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { tokens: limit - 1, lastRefill: now, limit, windowMs };
    buckets.set(key, b);
    if (++opsSinceSweep >= SWEEP_EVERY_NEW_KEYS) {
      opsSinceSweep = 0;
      sweep(now);
    }
    return { ok: true, remaining: Math.floor(b.tokens), retryAfterSec: 0 };
  }
  refill(b, now);
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { ok: true, remaining: Math.floor(b.tokens), retryAfterSec: 0 };
  }
  const ratePerMs = b.limit / b.windowMs;
  const retryAfterSec = Math.max(1, Math.ceil((1 - b.tokens) / ratePerMs / 1000));
  return { ok: false, remaining: 0, retryAfterSec };
}

/**
 * Best-effort real client IP. The app sits behind the HTTPS tunnel proxy, so
 * the chain is in `x-forwarded-for` (leftmost = original client). Falls back
 * to `x-real-ip`, then "unknown" (all tunnel-less/localhost callers collapse
 * to one bucket — conservative, which is what a throttle should be).
 *
 * Accepts either a `Headers` instance (route handlers / middleware) or the
 * plain header record NextAuth passes to `authorize()` (RequestInternal).
 */
export function clientIp(req: unknown): string {
  const headers =
    req && typeof req === "object" && "headers" in req
      ? (req as { headers?: unknown }).headers
      : req;
  if (!headers) return "unknown";
  if (typeof (headers as Headers).get === "function") {
    const h = headers as Headers;
    const fwd = h.get("x-forwarded-for");
    if (fwd) {
      const first = fwd.split(",")[0]?.trim();
      if (first) return first;
    }
    const real = h.get("x-real-ip");
    if (real) return real;
    return "unknown";
  }
  const rec = headers as Record<string, unknown>;
  const fwd = rec["x-forwarded-for"];
  if (typeof fwd === "string") {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = rec["x-real-ip"];
  if (typeof real === "string") return real;
  return "unknown";
}

/** Uniform 429 JSON response with Retry-After. Customer-friendly wording is the caller's job. */
export function tooManyRequests(message: string, retryAfterSec: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil(retryAfterSec));
  return NextResponse.json(
    { error: message, retryAfterSec: retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

// ─── Upload quota (S-05) ────────────────────────────────────────────────────
// No Upload/Evidence model exists in the Prisma schema, so per-user storage
// is tracked in-memory: 50 MB per user per rolling 24h, on top of the existing
// 5 MB-per-file cap. Resets on restart — acceptable at this stage (an attacker
// re-filling after a restart still needs a restart, and the 5 MB/file cap
// bounds any single write).

export const UPLOAD_QUOTA_BYTES = 50 * 1024 * 1024; // 50 MB
export const UPLOAD_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h

interface ByteBudget {
  bytes: number;
  windowStart: number;
}

const byteBudgets = new Map<string, ByteBudget>();

export function consumeUploadQuota(
  userId: string,
  bytes: number
): { ok: boolean; usedBytes: number; retryAfterSec: number } {
  const now = Date.now();
  let b = byteBudgets.get(userId);
  if (!b || now - b.windowStart >= UPLOAD_QUOTA_WINDOW_MS) {
    b = { bytes: 0, windowStart: now };
    byteBudgets.set(userId, b);
  }
  if (b.bytes + bytes > UPLOAD_QUOTA_BYTES) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((b.windowStart + UPLOAD_QUOTA_WINDOW_MS - now) / 1000)
    );
    return { ok: false, usedBytes: b.bytes, retryAfterSec };
  }
  b.bytes += bytes;
  return { ok: true, usedBytes: b.bytes, retryAfterSec: 0 };
}
