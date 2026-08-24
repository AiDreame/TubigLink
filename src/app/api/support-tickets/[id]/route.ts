import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pushTicketStatusChange } from "@/lib/discord";

/**
 * Update a general support ticket's status (creator or admin only). Owner
 * direction, Aug 24: a ticket can be marked RESOLVED or CLOSED, and a RESOLVED
 * ticket can later be CLOSED. Once CLOSED, no re-open (CLOSED and, once you
 * leave RESOLVED for CLOSED, that is terminal too).
 *
 * Allowed transitions:
 *   OPEN     -> RESOLVED, CLOSED
 *   RESOLVED -> CLOSED
 *   CLOSED   -> (none — terminal)
 *
 * SECURITY: session + ownership-scoped (creator or admin only), matching the
 * messages route. No status value can move a ticket backwards toward OPEN, and
 * the status is validated against the transition map before any write.
 */

// Allowed next states for each current state. Missing keys are terminal.
const TRANSITIONS: Record<string, string[]> = {
  OPEN: ["RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const allowed = ticket.userId === user.id || user.role === "ADMIN";
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const nextStates = TRANSITIONS[ticket.status];
  if (!nextStates) {
    return NextResponse.json({ error: "This ticket is already closed and cannot be reopened" }, { status: 400 });
  }
  if (!nextStates.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status transition from ${ticket.status} to ${status || "(empty)"}` },
      { status: 400 }
    );
  }

  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status },
  });

  // Push a short note into the bound Discord thread (fire-and-forget; no-op when
  // Discord is unconfigured or no thread exists yet).
  const actorName = (user.name || user.phone || user.role || "User").slice(0, 80);
  void pushTicketStatusChange(ticket, status, actorName);

  return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status } });
}
