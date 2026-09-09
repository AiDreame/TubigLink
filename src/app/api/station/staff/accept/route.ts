import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { recordAudit } from "@/lib/audit";

// POST /api/station/staff/accept — Accept an invitation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, name, phone, password } = body;

    if (!token) {
      return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Find the invitation
    const staff = await prisma.stationStaff.findUnique({
      where: { inviteToken: token },
      include: {
        station: { select: { name: true } },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 404 }
      );
    }

    if (staff.status !== "INVITED") {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 410 }
      );
    }

    // Check if a user with this email already exists
    let user = await prisma.user.findUnique({
      where: { email: staff.email },
    });

    if (!user) {
      // Create a new user account
      if (!password) {
        return NextResponse.json(
          { error: "Password is required to create a new account" },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      user = await prisma.user.create({
        data: {
          email: staff.email,
          phone: phone || staff.email.substring(0, 10).replace(/[^0-9]/g, "").padStart(11, "0"),
          name,
          password: hashedPassword,
          role: "PROVIDER", // Staff members are providers for auth purposes
          isVerified: true,
        },
      });
    } else {
      // Update the existing user's name if provided
      if (name && name !== user.name) {
        await prisma.user.update({
          where: { id: user.id },
          data: { name },
        });
      }
    }

    // Update the staff record to link to the user and mark as active
    const updatedStaff = await prisma.stationStaff.update({
      where: { id: staff.id },
      data: {
        userId: user.id,
        status: "ACTIVE",
        acceptedAt: new Date(),
        name: name || staff.name,
        phone: phone || staff.phone,
      },
    });

    void recordAudit({ actor: { id: user.id, role: "PROVIDER" }, action: "staff.accept", entityType: "staff", entityId: updatedStaff.id, details: { stationId: staff.stationId, stationName: staff.station.name } });
    return NextResponse.json({
      success: true,
      data: {
        staffId: updatedStaff.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: updatedStaff.role,
        stationName: staff.station.name,
        status: "ACTIVE",
      },
      message: `You have successfully joined ${staff.station.name}!`,
    });
  } catch (error) {
    console.error("Staff accept error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}