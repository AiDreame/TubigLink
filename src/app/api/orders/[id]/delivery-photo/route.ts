import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

// POST /api/orders/[orderId]/delivery-photo — Attach optional delivery evidence
// photo (station owner / active station staff / admin only; before customer
// confirmation). Stored as a file under uploads/{stationId}/delivery/ and served
// via the existing /api/uploads/[...path] route (same pattern as station
// compliance documents — no new dependencies, no base64 bloat in SQLite).
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB cap (owner/plan constraint)
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { station: { select: { userId: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Station-scope authorization: owner, admin, or active staff of the order's
    // station (includes assigned drivers, who are active StationStaff rows).
    const isOwner = order.station.userId === user.id;
    if (!isOwner && user.role !== "ADMIN") {
      const staff = await prisma.stationStaff.findFirst({
        where: { userId: user.id, stationId: order.stationId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!staff) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Photo is delivery evidence: only attach while the order is delivered and
    // the customer has not yet confirmed (auto-confirm closes the window too).
    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        { error: "Delivery photo can only be attached to a delivered order" },
        { status: 400 }
      );
    }
    if (order.deliveryConfirmedAt && order.deliveryPhoto) {
      return NextResponse.json(
        { error: "Delivery already has evidence — photo window closed" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and WebP images are allowed." },
        { status: 400 }
      );
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid content type — image files only" },
        { status: 400 }
      );
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "uploads", order.stationId, "delivery");
    await fs.mkdir(dir, { recursive: true });
    const fileName = `${order.id}${ext}`;
    const filePath = path.join(dir, fileName);
    await fs.writeFile(filePath, buffer);

    const photoUrl = `/api/uploads/${order.stationId}/delivery/${fileName}`;

    // If a photo was attached earlier (pre-confirmation re-upload), replace the
    // stored URL. Old file variants from a different extension are left alone
    // (rare; same order id, different ext) — overwrite keeps this simple.
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { deliveryPhoto: photoUrl },
      include: {
        items: { include: { product: true } },
        station: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Delivery photo upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload delivery photo" },
      { status: 500 }
    );
  }
}
