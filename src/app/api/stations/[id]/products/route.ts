import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/stations/[id]/products — Get all products for a station
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const products = await prisma.product.findMany({
      where: { stationId: params.id },
      orderBy: { price: "asc" },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Products fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/stations/[id]/products — Add a product to a station
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, type, size, price, stock, description } = body;

    if (!name || !price) {
      return NextResponse.json(
        { error: "Product name and price are required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        stationId: params.id,
        name,
        type: type || "PURIFIED",
        size: size || "5-gallon",
        price,
        stock: stock || 0,
        description,
      },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}