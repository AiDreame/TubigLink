import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getDefaultPermissions } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";
import { recordAudit } from "@/lib/audit";

// POST /api/station/staff/invite — Send staff invite (owner only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { email, role, name, phone } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate role
    const validRoles = ["STAFF", "MANAGER", "ADMIN", "DRIVER"];
    const staffRole = role && validRoles.includes(role) ? role : "STAFF";

    // Get the user's station
    const station = await prisma.station.findFirst({
      where: { userId },
    });

    if (!station) {
      return NextResponse.json(
        { error: "No station found. Create a station first." },
        { status: 404 }
      );
    }

    // Check if this email already has an active invite for this station
    const existingStaff = await prisma.stationStaff.findFirst({
      where: {
        stationId: station.id,
        email,
        status: { in: ["INVITED", "ACTIVE"] },
      },
    });

    if (existingStaff) {
      return NextResponse.json(
        {
          error:
            "This person has already been invited or is already a staff member",
        },
        { status: 409 }
      );
    }

    // Generate unique invite token
    const inviteToken = crypto.randomUUID();

    // Determine default permissions based on role
    const defaultPermissions = getDefaultPermissions(staffRole);

    // Create staff record
    const staff = await prisma.stationStaff.create({
      data: {
        stationId: station.id,
        email,
        name: name || null,
        phone: phone || null,
        role: staffRole,
        status: "INVITED",
        permissions: JSON.stringify(defaultPermissions),
        inviteToken,
        invitedById: userId,
      },
      include: {
        station: { select: { name: true } },
      },
    });

    // Send invite email after recording the invite. A failed send does not remove
    // the record, so the invitation can be retried.
    const inviteBaseUrl =
      process.env.INVITE_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://151ddcb0324ec849a5e3e6c1f3692000.ctonew.app";
    const acceptUrl = `${inviteBaseUrl.replace(/\/+$/, "")}/station/staff/accept?token=${encodeURIComponent(inviteToken)}`;
    const text = `You've been invited to join ${staff.station.name} on AquaLink PH.\n\nRole: ${staffRole}\n\nAccept your invitation: ${acceptUrl}\n\nThis invitation will expire once used.`;
    const html = `<!doctype html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; color: #172033; line-height: 1.5;">
    <h1>You're invited to AquaLink PH</h1>
    <p>You've been invited to join <strong>${staff.station.name}</strong> as a <strong>${staffRole}</strong>.</p>
    <p><a href="${acceptUrl}" style="display: inline-block; padding: 12px 20px; background: #0ea5e9; color: #fff; text-decoration: none; border-radius: 6px;">Accept invitation</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${acceptUrl}">${acceptUrl}</a></p>
    <p>This invitation will expire once used.</p>
  </body>
</html>`;
    const emailResult = await sendEmail({
      to: email,
      subject: `You're invited to join ${staff.station.name} on AquaLink PH`,
      html,
      text,
    });
    const emailStatus = emailResult.ok ? "SENT" : "FAILED";
    const message = emailResult.ok
      ? `Invitation sent to ${email}`
      : `Invitation recorded for ${email}, but the email failed to send: ${emailResult.error}`;

    void recordAudit({ actor: { id: userId, role: "PROVIDER" }, action: "staff.invite", entityType: "staff", entityId: staff.id, details: { stationId: staff.stationId, email: staff.email, role: staff.role, emailStatus } });
    return NextResponse.json(
      {
        success: true,
        data: {
          id: staff.id,
          email: staff.email,
          role: staff.role,
          status: staff.status,
          stationName: staff.station.name,
          inviteToken, // Only returned on creation
          emailStatus,
        },
        message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Staff invite error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
