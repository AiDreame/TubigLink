import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, password, role } = body;

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
        role: role || "CUSTOMER",
      },
    });

    // If role is PROVIDER, also create a station
    if (role === "PROVIDER" && body.stationName) {
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