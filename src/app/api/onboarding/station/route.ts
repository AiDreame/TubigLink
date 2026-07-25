import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/utils";

// POST /api/onboarding/station — Create or update onboarding data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step, data } = body;

    // Step 1: Create account (no session needed)
    if (step === 1) {
      const { name, phone, email, password, convertAccount } = data;

      if (!phone || !name || !password) {
        return NextResponse.json(
          { success: false, error: "Name, phone, and password are required" },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingUser) {
        // If this is a customer account and user wants to convert
        if (existingUser.role === "CUSTOMER") {
          // If the frontend explicitly requested conversion
          if (convertAccount) {
            // Update role to PROVIDER and create station
            const updatedUser = await prisma.user.update({
              where: { id: existingUser.id },
              data: { role: "PROVIDER" },
            });

            const slug = slugify(data.stationName || "water-station") + "-" + Math.random().toString(36).substring(2, 6);
            await prisma.station.create({
              data: {
                userId: updatedUser.id,
                name: data.stationName || "My Water Station",
                slug,
                address: "",
                barangay: "",
                city: "",
                province: "",
                onboardingStep: 1,
                onboardingComplete: false,
              },
            });

            return NextResponse.json({
              success: true,
              message: "Account converted to provider! Proceed to step 2.",
              data: { userId: updatedUser.id, converted: true },
            });
          }

          // Otherwise, tell the frontend this account can be converted
          return NextResponse.json(
            {
              success: false,
              canConvert: true,
              message: "This phone number already has a customer account. Would you like to convert it to a water station provider account?",
            },
            { status: 409 }
          );
        }

        // Non-customer account (already a provider or admin)
        return NextResponse.json(
          { success: false, error: "Phone number already registered as a provider" },
          { status: 409 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          name,
          phone,
          email: email || undefined,
          password: hashedPassword,
          role: "PROVIDER",
        },
      });

      // Create a draft station entry
      const slug = slugify(data.stationName || "water-station") + "-" + Math.random().toString(36).substring(2, 6);
      await prisma.station.create({
        data: {
          userId: user.id,
          name: data.stationName || "My Water Station",
          slug,
          address: "",
          barangay: "",
          city: "",
          province: "",
          onboardingStep: 1,
          onboardingComplete: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Account created! Proceed to step 2.",
        data: { userId: user.id },
      });
    }

    // Steps 2-5: Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please log in" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const station = await prisma.station.findFirst({ where: { userId } });
    if (!station) {
      return NextResponse.json(
        { success: false, error: "No station found for this account" },
        { status: 404 }
      );
    }

    // Step 2: Station Info
    if (step === 2) {
      const { name, description, address, barangay, city, province, phone, businessType, tin } = data;

      if (!name || !address || !barangay || !city) {
        return NextResponse.json(
          { success: false, error: "Station name, address, barangay, and city are required" },
          { status: 400 }
        );
      }

      const newSlug = slugify(name) + "-" + Math.random().toString(36).substring(2, 6);

      const updated = await prisma.station.update({
        where: { id: station.id },
        data: {
          name,
          slug: newSlug,
          description: description || "",
          address,
          barangay,
          city,
          province: province || "",
          phone: phone || "",
          businessType: businessType || null,
          tin: tin || null,
          onboardingStep: 2,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // Step 3: Products & Pricing
    if (step === 3) {
      const { products } = data;

      if (!Array.isArray(products) || products.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one product is required" },
          { status: 400 }
        );
      }

      // Delete existing products and recreate
      await prisma.product.deleteMany({ where: { stationId: station.id } });

      const created = await prisma.product.createMany({
        data: products.map((p: any) => ({
          stationId: station.id,
          name: p.name || `${p.type} ${p.size}`,
          type: p.type || "PURIFIED",
          size: p.size || "5-gallon",
          price: parseFloat(p.price) || 0,
          stock: parseInt(p.stock) || 0,
          isAvailable: true,
          description: p.description || "",
        })),
      });

      await prisma.station.update({
        where: { id: station.id },
        data: { onboardingStep: 3 },
      });

      return NextResponse.json({ success: true, data: { count: created.count } });
    }

    // Step 4: Delivery Zones
    if (step === 4) {
      const { zones } = data;

      if (!Array.isArray(zones) || zones.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one delivery zone is required" },
          { status: 400 }
        );
      }

      // Delete existing zones and recreate
      await prisma.deliveryZone.deleteMany({ where: { stationId: station.id } });

      const created = await prisma.deliveryZone.createMany({
        data: zones.map((z: any) => ({
          stationId: station.id,
          barangay: z.barangay,
          city: z.city || station.city,
          deliveryFee: parseFloat(z.deliveryFee) || 0,
          estimatedMinutes: parseInt(z.estimatedMinutes) || 30,
        })),
      });

      await prisma.station.update({
        where: { id: station.id },
        data: { onboardingStep: 4 },
      });

      return NextResponse.json({ success: true, data: { count: created.count } });
    }

    // Step 5: Operating Hours & Final Submit
    if (step === 5) {
      const { openingTime, closingTime, deliveryFee, minOrder } = data;

      const updated = await prisma.station.update({
        where: { id: station.id },
        data: {
          openingTime: openingTime || "06:00",
          closingTime: closingTime || "21:00",
          deliveryFee: parseFloat(deliveryFee) || 0,
          minOrder: parseFloat(minOrder) || 0,
          onboardingStep: 5,
          onboardingComplete: true,
          onboardingSubmittedAt: new Date(),
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Onboarding complete! Your station is now live.",
        data: updated,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid step number" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// GET /api/onboarding/station — Get current onboarding state
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const station = await prisma.station.findFirst({
      where: { userId },
      include: {
        products: true,
        deliveryZones: true,
      },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "No station found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: station });
  } catch (error) {
    console.error("Onboarding fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch onboarding data" },
      { status: 500 }
    );
  }
}