import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { reviewDisplayName } from "@/lib/review-display";

// GET /api/stations/[id] — Get station details with products and reviews.
//
// PUBLIC endpoint (no auth). N-09 (owner decision): the owner's PERSONAL
// name + phone (User.name/User.phone) must never appear on the public
// storefront. This endpoint no longer includes the station owner's user
// record at all; the storefront contact block uses the BUSINESS-provided
// Station.phone (set via onboarding/settings), and storefront visitors reach
// the owner through the contact form (POST /api/stations/[id]/contact).
//
// REVIEWS: public here too — reviewer identities are mapped to display-safe
// first names ("Juan", "Verified Customer" fallback). Real names stay in the
// DB, untouched.
//
// PAYOUT/BANK fields (payoutBankName etc.) are NOT needed by any public
// consumer (only /api/admin/payouts reads them, from a different endpoint)
// and are dropped from this response.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const station = await prisma.station.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        products: {
          where: { isAvailable: true },
          orderBy: { price: "asc" },
        },
        deliveryZones: true,
        reviews: {
          include: {
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    // Decompose to a plain object so we can drop non-public fields and shape
    // the review payload (Prisma results are class instances; mutation on the
    // response object is not reliable, and `user` is already excluded above).
    const { reviews, ...rest } = station as any;
    const publicReviews = (reviews || []).map((r: any) => ({
      ...r,
      user: {
        name: reviewDisplayName(r.user?.name ?? null),
      },
    }));
    const publicStation: Record<string, any> = { ...rest };
    // Payout/bank destination fields are for admins only — never public.
    for (const key of [
      "payoutMethod",
      "payoutBankName",
      "payoutAccountName",
      "payoutAccountLast4",
      "payoutDetails",
    ]) {
      delete publicStation[key];
    }

    return NextResponse.json({
      success: true,
      data: { ...publicStation, reviews: publicReviews },
    });
  } catch (error) {
    console.error("Station fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch station" },
      { status: 500 }
    );
  }
}

// PUT /api/stations/[id] — Update station storefront details
// N-02 (security audit 2026-08-18): previously unauthenticated + no field
// whitelist (any anonymous caller could mutate any station, incl. the payout
// destination and isActive/isFeatured). Now: session required, ownership
// enforced (station owner or ADMIN), and only the storefront-editable fields
// are accepted. Payout/approval/flag fields are NOT writable here — they
// belong to the OTP-gated payout flow and admin flows only.
const STOREFRONT_ALLOWED_FIELDS = [
  "name", "slug", "description", "logo", "banner", "phone",
  "address", "barangay", "city", "province",
  "latitude", "longitude",
  "deliveryFee", "minOrder",
  "openingTime", "closingTime",
] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await req.json();

    const station = await prisma.station.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    // Ownership: station owner or platform ADMIN only.
    const isOwner = station.userId === sessionUser.id;
    const isAdmin = sessionUser.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Whitelist the writable fields — silently drop anything else (payout
    // fields, isActive, isFeatured, approvedAt, etc.).
    const filteredFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(body)) {
      if ((STOREFRONT_ALLOWED_FIELDS as readonly string[]).includes(key)) {
        filteredFields[key] = value;
      }
    }

    // Keep slug consistent if the name changes but no slug was provided.
    if (
      filteredFields.name &&
      !filteredFields.slug &&
      filteredFields.name !== station.name
    ) {
      filteredFields.slug = filteredFields.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const updatedStation = await prisma.station.update({
      where: { id: station.id },
      data: filteredFields,
    });

    return NextResponse.json({ success: true, data: updatedStation });
  } catch (error) {
    console.error("Station update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update station" },
      { status: 500 }
    );
  }
}