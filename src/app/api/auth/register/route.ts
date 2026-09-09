import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    // S-05 (security audit 2026-08-14): per-IP signup throttle — 5 attempts /
    // hour (token bucket). Checked before any work so throttled attempts cost
    // nothing. Also caps the S-04 "phone already registered" enumeration
    // oracle at 5 probes/hour/IP.
    const rl = rateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return tooManyRequests(
        "Too many sign-up attempts from this address. Please try again later.",
        rl.retryAfterSec
      );
    }
    const body = await req.json();
    const { name, phone, email, password, role } = body;

    // S-02 (security audit 2026-08-14): whitelist roles server-side.
    // Never accept privileged roles (ADMIN, etc.) from the client.
    const ALLOWED_ROLES = ["CUSTOMER", "PROVIDER"];
    const userRole = typeof role === "string" && ALLOWED_ROLES.includes(role) ? role : "CUSTOMER";

    // Validate required fields
    if (!phone || !name || !password) {
      return NextResponse.json(
        { error: "Name, phone, and password are required" },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email: email || undefined,
        password: hashedPassword,
        role: userRole,
      },
    });

    // If role is PROVIDER, also create a station
    if (userRole === "PROVIDER" && body.stationName) {
      const slug = slugify(body.stationName) + "-" + Math.random().toString(36).substring(2, 6);

      await prisma.station.create({
        data: {
          userId: user.id,
          name: body.stationName,
          slug,
          address: body.stationAddress || "",
          barangay: "",
          city: body.stationCity || "Manila",
          province: "Metro Manila",
        },
      });
    }

    void recordAudit({ action: "user.register", entityType: "user", entityId: user.id, details: { role: user.role, stationName: userRole === "PROVIDER" ? body.stationName || null : null } });
    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}