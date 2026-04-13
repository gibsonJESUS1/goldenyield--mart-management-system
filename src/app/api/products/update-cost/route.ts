import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      productId?: string;
      costPrice?: number;
      note?: string | null;
    };

    const productId = body.productId?.trim();
    const parsedCostPrice = Number(body.costPrice ?? 0);
    const note = body.note?.trim() || null;

    if (!productId) {
      return NextResponse.json(
        { message: "Product is required" },
        { status: 400 },
      );
    }

    if (!parsedCostPrice || parsedCostPrice <= 0) {
      return NextResponse.json(
        { message: "Cost price must be greater than zero" },
        { status: 400 },
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        currentCostPrice: parsedCostPrice,
      },
      select: {
        id: true,
        name: true,
        currentCostPrice: true,
      },
    });

    return NextResponse.json({
      message: "Cost price updated successfully",
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        currentCostPrice: Number(updatedProduct.currentCostPrice ?? 0),
      },
      note,
    });
  } catch (error) {
    console.error("POST /api/products/update-cost error:", error);

    return NextResponse.json(
      { message: "Failed to update cost price" },
      { status: 500 },
    );
  }
}
