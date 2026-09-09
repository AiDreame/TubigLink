import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

// DELETE /api/me — delete the authenticated user's own account.
// Apple review guideline 5.1.1(v): users must be able to delete their account
// in-app. Behavior:
//   - ADMIN self-delete is blocked (400).
//   - HARD DELETE: user has no transactional history (orders, disputes,
//     refunds requested, support tickets) and no dependent rows that must be
//     kept → delete owned child rows (addresses, paymentMethods,
//     notifications, otpCodes, reviews, staff records where they're only a
//     linked user, staff invites they sent only if unaccepted) then the
//     user. Station ownership itself counts as history (see hasHistory), so
//     any owned station takes the SOFT path; the hard path only runs when
//     the user owns no station.
//   - SOFT DELETE: user has history → keep the row for record/audit, set
//     deletedAt, anonymize PII (name/email/avatar/password cleared, phone
//     replaced with a non-reusable tombstone), delete OTP codes, and
//     deactivate any owned stations (isActive=false) without deleting them.
//   - After deletion the client signs out; sign-in rejects deleted users.
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        stations: { select: { id: true } },
        _count: {
          select: {
            orders: true,
            reviews: true,
            customerDisputes: true,
            refundsRequested: true,
            supportTickets: true,
            staffInvited: true,
            staffRecords: true,
            verifiedDocuments: true,
            verifiedSteps: true,
            verificationActions: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json(
        { error: "Account not found or already deleted" },
        { status: 404 }
      );
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Admin accounts cannot be deleted this way. Please ask another admin to remove this account.",
        },
        { status: 400 }
      );
    }

    const c = user._count;
    const hasHistory =
      c.orders > 0 ||
      c.customerDisputes > 0 ||
      c.refundsRequested > 0 ||
      c.supportTickets > 0 ||
      user.stations.length > 0 ||
      c.verifiedDocuments > 0 ||
      c.verifiedSteps > 0 ||
      c.verificationActions > 0;

    const now = new Date();

    if (!hasHistory) {
      // ── HARD DELETE: no transaction history to preserve ──
      // FK order matters: delete leaf rows first.
      await prisma.$transaction([
        prisma.otpCode.deleteMany({ where: { userId: user.id } }),
        prisma.notification.deleteMany({ where: { userId: user.id } }),
        prisma.paymentMethod.deleteMany({ where: { userId: user.id } }),
        prisma.address.deleteMany({ where: { userId: user.id } }),
        prisma.review.deleteMany({ where: { userId: user.id } }),
        // Detach from staff records (invite email/name retained for the
        // station's roster) and drop pending invites this user sent.
        prisma.stationStaff.updateMany({
          where: { userId: user.id },
          data: { userId: null, status: "DEACTIVATED" },
        }),
        prisma.stationStaff.deleteMany({
          where: { invitedById: user.id, status: "INVITED" },
        }),
      ]);
      await prisma.user.delete({ where: { id: user.id } });
      void recordAudit({ actor: { id: user.id, role: sessionUser.role || "CUSTOMER" }, action: "user.delete", entityType: "user", entityId: user.id, details: { mode: "hard" } });
      return NextResponse.json({ success: true, mode: "hard" });
    }

    // ── SOFT DELETE: anonymize + tombstone, keep history ──
    // Tombstone phone keeps the UNIQUE constraint satisfied while making the
    // original number re-registerable: original phone is gone from the row.
    const tombstone = `deleted+${user.id}@deleted.local`;
    const deletedPhone = `+63000${Date.now().toString().slice(-7)}${Math.floor(
      Math.random() * 90 + 10
    )}`;

    await prisma.$transaction([
      // Owned stations stay for record but go offline.
      prisma.station.updateMany({
        where: { userId: user.id },
        data: { isActive: false, isFeatured: false },
      }),
      // Detach from staff roster rows (station keeps invite history).
      prisma.stationStaff.updateMany({
        where: { userId: user.id },
        data: { userId: null, status: "DEACTIVATED" },
      }),
      prisma.stationStaff.deleteMany({
        where: { invitedById: user.id, status: "INVITED" },
      }),
      // OTP codes must die with the account (no post-delete reuse).
      prisma.otpCode.deleteMany({ where: { userId: user.id } }),
      // Notifications may reference personal context — drop them.
      prisma.notification.deleteMany({ where: { userId: user.id } }),
      // Stored payment method details are PII — drop them.
      prisma.paymentMethod.deleteMany({ where: { userId: user.id } }),
      // Delivery addresses are PII — drop them (past order snapshots on the
      // Order rows themselves are retained for records).
      prisma.address.deleteMany({ where: { userId: user.id } }),
      // Review text may contain PII — strip to rating-only.
      prisma.review.updateMany({
        where: { userId: user.id },
        data: { comment: null },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          deletedAt: now,
          name: "Deleted User",
          email: tombstone,
          phone: deletedPhone,
          password: null,
          avatar: null,
          isVerified: false,
        },
      }),
    ]);

    void recordAudit({ actor: { id: user.id, role: sessionUser.role || "CUSTOMER" }, action: "user.delete", entityType: "user", entityId: user.id, details: { mode: "soft" } });
    return NextResponse.json({ success: true, mode: "soft" });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
