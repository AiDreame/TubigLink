import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/user/profile — Get user profile
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: { orders: true, addresses: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile — Update user profile
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, email, avatar } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(avatar && { avatar }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/profile — Delete user account and all associated data
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID not found in session" },
        { status: 400 }
      );
    }

    // Delete all related data in order (respecting foreign key constraints)
    // 1. Delete reviews
    await prisma.review.deleteMany({ where: { userId } });

    // 2. Delete notifications
    await prisma.notification.deleteMany({ where: { userId } });

    // 3. Delete payment methods
    await prisma.paymentMethod.deleteMany({ where: { userId } });

    // 4. Find and delete orders and their items
    const userOrders = await prisma.order.findMany({ where: { userId }, select: { id: true } });
    for (const order of userOrders) {
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    }
    await prisma.order.deleteMany({ where: { userId } });

    // 5. Delete addresses
    await prisma.address.deleteMany({ where: { userId } });

    // 6. Find stations and delete their related data
    const userStations = await prisma.station.findMany({ where: { userId }, select: { id: true } });
    for (const station of userStations) {
      // Delete delivery zones
      await prisma.deliveryZone.deleteMany({ where: { stationId: station.id } });
      // Delete products
      await prisma.product.deleteMany({ where: { stationId: station.id } });
      // Delete station orders and items
      const stationOrders = await prisma.order.findMany({ where: { stationId: station.id }, select: { id: true } });
      for (const order of stationOrders) {
        await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      }
      await prisma.order.deleteMany({ where: { stationId: station.id } });
      // Delete station reviews
      await prisma.review.deleteMany({ where: { stationId: station.id } });
      // Delete station documents
      await prisma.stationDocument.deleteMany({ where: { stationId: station.id } });
      // Delete station verification
      await prisma.stationVerification.deleteMany({ where: { stationId: station.id } });
      // Delete verification logs
      await prisma.verificationLog.deleteMany({ where: { stationId: station.id } });
      // Delete station staff
      await prisma.stationStaff.deleteMany({ where: { stationId: station.id } });
    }

    // 7. Delete stations
    await prisma.station.deleteMany({ where: { userId } });

    // 8. Also clean up any station staff records where user is the staff member
    await prisma.stationStaff.deleteMany({ where: { userId } });

    // 9. Delete documents the user verified
    await prisma.stationDocument.deleteMany({ where: { verifiedById: userId } });
    await prisma.stationVerification.deleteMany({ where: { verifiedById: userId } });
    await prisma.verificationLog.deleteMany({ where: { performedById: userId } });

    // 10. Finally, delete the user
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete account" },
      { status: 500 }
    );
  }
}