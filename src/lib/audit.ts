import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import prisma from "./prisma";

// ─── System-wide audit log (Phase 1, owner audit-trail request) ───
// recordAudit() captures WHO did WHAT WHEN for user/station/admin actions.
// Convention: call AFTER the authoritative DB write succeeds (so the log
// reflects reality), fire-and-forget style — never blocks the response and
// NEVER throws (a broken audit write must not break the main action).
//
// Actor resolution: pass `actor` explicitly when the caller already knows the
// DB-resolved user id + role (preferred — zero extra queries). Otherwise the
// helper resolves the current actor from the NextAuth session. Per the N-03
// pattern, a JWT staff claim is NEVER used as the actor id: session-role
// "STAFF"/"DRIVER"-style claims fall back to SYSTEM unless the caller passes
// the DB-resolved user id explicitly.

export type AuditActor = { id: string; role: string } | null;

export interface AuditOpts {
  actor?: AuditActor;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

function safeDetails(details?: Record<string, unknown>): string | undefined {
  if (!details) return undefined;
  try {
    // Compact JSON; truncate to keep rows small (~4KB cap).
    const s = JSON.stringify(details);
    return s.length > 4000 ? s.slice(0, 4000) : s;
  } catch {
    return undefined;
  }
}

export async function recordAudit(opts: AuditOpts): Promise<void> {
  try {
    let actorId: string | null = null;
    let actorRole: string | null = null;
    if (opts.actor === null) {
      actorId = null;
      actorRole = "SYSTEM";
    } else if (opts.actor) {
      actorId = opts.actor.id;
      actorRole = opts.actor.role;
    } else {
      // Resolve from the current session. N-03: only DB-backed user roles
      // (CUSTOMER/PROVIDER/ADMIN) are trusted as identity; staff JWT claims
      // are not an identity, so they resolve to SYSTEM unless the caller
      // passes the DB-resolved user id as `actor` explicitly.
      try {
        const session = await getServerSession(authOptions);
        const u = session?.user as any;
        if (u?.id && ["CUSTOMER", "PROVIDER", "ADMIN"].includes(u.role)) {
          actorId = u.id;
          actorRole = u.role;
        } else if (u?.id) {
          actorId = u.id;
          actorRole = "STAFF";
        }
      } catch {
        // Session unavailable (e.g. webhook context) → SYSTEM below.
      }
      if (!actorRole) actorRole = "SYSTEM";
    }
    await (prisma as any).auditLog.create({
      data: {
        actorId,
        actorRole,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        details: safeDetails(opts.details),
      },
    });
  } catch (err) {
    // Audit must NEVER break the main action.
    console.warn("[audit] failed to record", opts.action, err);
  }
}
