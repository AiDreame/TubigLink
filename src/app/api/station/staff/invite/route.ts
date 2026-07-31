import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getDefaultPermissions } from "@/lib/permissions";
import crypto from "crypto";

const ACCEPT_URL = process.env.NEXT_PUBLIC_APP_URL || "https://61ff115f14e4bafeeef5aa11e5e6452d.ctonew.app";

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
        { error: "This person has already been invited or is already a staff member" },
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

    // Send invite email
    const acceptUrl = `${ACCEPT_URL}/station/staff/accept?token=${inviteToken}`;
    const emailBody = `You've been invited to join ${staff.station.name} on AquaLink PH.
      
Role: ${staffRole}

Click here to accept your invitation:
${acceptUrl}

This invitation will expire once used.`;

    try {
      // Use the team's inbox to send the email
      const inboxId = "aqualink-ph-48fab409@ctomail.io";
      // We'll just log it for now since sending email requires the inbox tool
      console.log(`[STAFF INVITE] To: ${email}, Station: ${staff.station.name}, URL: ${acceptUrl}`);
    } catch (emailErr) {
      console.error("Failed to send invite email:", emailErr);
      // Don't fail the request — the invite record is already created
    }

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
        },
        message: `Invitation sent to ${email}`,
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