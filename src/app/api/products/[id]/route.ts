import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UNLIMITED_STOCK_SIZES, UNLIMITED_STOCK_SENTINEL } from "@/lib/constants";

// PUT /api/products/[id] — Update a product
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, type, size, price, stock, description, isAvailable } = body;

    // Check if product exists and belongs to the user's station
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { station: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Only the station owner or an admin can update the product
    if (product.station.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If trying to make product available, verify station has TIN
    if (isAvailable === true && !product.station.tin) {
      return NextResponse.json(
        { error: "Cannot list products until TIN is provided. Complete your BIR registration first." },
        { status: 403 }
      );
    }

    // If the product is a 5-gallon (on-demand), set stock to sentinel
    const effectiveSize = size !== undefined ? size : product.size;
    const effectiveStock = UNLIMITED_STOCK_SIZES.includes(effectiveSize)
      ? UNLIMITED_STOCK_SENTINEL
      : (stock !== undefined ? stock : product.stock);

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        name,
        type,
        size,
        price,
        stock: effectiveStock,
        description,
        isAvailable,
      },
    });

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Product update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] — Delete a product
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if product exists and belongs to the user's station
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { station: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Only the station owner or an admin can delete the product
    if (product.station.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch (error) {
    console.error("Product deletion error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
