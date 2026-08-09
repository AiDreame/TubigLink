import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Parse optional latitude/longitude pair from a request body.
// Returns { ok: true, values } when absent or valid (both-or-neither,
// finite numbers within lat [-90,90] / lng [-180,180], or explicit nulls
// to clear). Returns { ok: false, error } on invalid input.
function parseCoordinates(
  body: Record<string, unknown>,
): { ok: true; values: { latitude?: number | null; longitude?: number | null } } | { ok: false; error: string } {
  const hasLat = body.latitude !== undefined;
  const hasLng = body.longitude !== undefined;
  if (!hasLat && !hasLng) return { ok: true, values: {} };
  if (hasLat !== hasLng) {
    return { ok: false, error: "latitude and longitude must be provided together" };
  }
  const lat = body.latitude as number | null;
  const lng = body.longitude as number | null;
  if (lat === null && lng === null) return { ok: true, values: { latitude: null, longitude: null } };
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return {
      ok: false,
      error: "latitude must be between -90 and 90, and longitude between -180 and 180",
    };
  }
  return { ok: true, values: { latitude: lat, longitude: lng } };
}

// GET /api/addresses — Get user's saved addresses
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: addresses });
  } catch (error) {
    console.error("Addresses fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

// POST /api/addresses — Add a new address
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, label, name, phone, street, barangay, city, province, zipCode, landmark, isDefault } = body;

    if (!userId || !name || !street || !barangay || !city) {
      return NextResponse.json(
        { error: "Missing required address fields" },
        { status: 400 }
      );
    }

    const coords = parseCoordinates(body);
    if (!coords.ok) {
      return NextResponse.json({ success: false, error: coords.error }, { status: 400 });
    }

    // If this is the default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        label: label || "Home",
        name,
        phone: phone || "",
        street,
        barangay,
        city,
        province: province || "Metro Manila",
        zipCode: zipCode || null,
        landmark: landmark || null,
        latitude: coords.values.latitude ?? null,
        longitude: coords.values.longitude ?? null,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({ success: true, data: address }, { status: 201 });
  } catch (error: any) {
    console.error("Address creation error:", error);
    // Handle Prisma foreign key constraint failure
    if (error?.code === "P2003" || error?.message?.includes("Foreign key constraint")) {
      return NextResponse.json(
        { success: false, error: "User not found. Please log in again." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create address" },
      { status: 500 }
    );
  }
}

// PUT /api/addresses?id=X — Update an existing address
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { label, name, phone, street, barangay, city, province, zipCode, landmark, isDefault, userId } = body;

    const coords = parseCoordinates(body);
    if (!coords.ok) {
      return NextResponse.json({ success: false, error: coords.error }, { status: 400 });
    }

    // If setting as default, unset other defaults for this user
    if (isDefault && userId) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, any> = {};
    if (label !== undefined) updateData.label = label;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (street !== undefined) updateData.street = street;
    if (barangay !== undefined) updateData.barangay = barangay;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (landmark !== undefined) updateData.landmark = landmark;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (coords.values.latitude !== undefined) updateData.latitude = coords.values.latitude;
    if (coords.values.longitude !== undefined) updateData.longitude = coords.values.longitude;

    const address = await prisma.address.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: address });
  } catch (error) {
    console.error("Address update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update address" },
      { status: 500 }
    );
  }
}

// PATCH /api/addresses?id=X — Partial update (e.g., set as default)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const coords = parseCoordinates(body);
    if (!coords.ok) {
      return NextResponse.json({ success: false, error: coords.error }, { status: 400 });
    }

    // If setting as default, unset other defaults for this user
    if (body.isDefault && body.userId) {
      await prisma.address.updateMany({
        where: { userId: body.userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, any> = {};
    if (body.label !== undefined) updateData.label = body.label;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.street !== undefined) updateData.street = body.street;
    if (body.barangay !== undefined) updateData.barangay = body.barangay;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.province !== undefined) updateData.province = body.province;
    if (body.zipCode !== undefined) updateData.zipCode = body.zipCode;
    if (body.landmark !== undefined) updateData.landmark = body.landmark;
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;
    if (coords.values.latitude !== undefined) updateData.latitude = coords.values.latitude;
    if (coords.values.longitude !== undefined) updateData.longitude = coords.values.longitude;

    const address = await prisma.address.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: address });
  } catch (error) {
    console.error("Address patch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update address" },
      { status: 500 }
    );
  }
}

// DELETE /api/addresses?id=X — Delete an address
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 }
      );
    }

    await prisma.address.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Address deleted" });
  } catch (error) {
    console.error("Address deletion error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
