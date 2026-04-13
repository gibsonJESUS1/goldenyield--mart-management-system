import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function toDecimal(value: number) {
  if (!Number.isFinite(value)) {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(value.toFixed(2));
}

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

    const result = await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          currentCostPrice: true,
        },
      });

      if (!existingProduct) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const oldCostPrice =
        existingProduct.currentCostPrice != null
          ? Number(existingProduct.currentCostPrice)
          : null;

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentCostPrice: toDecimal(parsedCostPrice),
        },
        select: {
          id: true,
          name: true,
          currentCostPrice: true,
        },
      });

      await tx.productCostPriceHistory.create({
        data: {
          productId: existingProduct.id,
          oldCostPrice:
            oldCostPrice != null ? toDecimal(oldCostPrice) : undefined,
          newCostPrice: toDecimal(parsedCostPrice),
          changeType: "MANUAL_UPDATE",
          note,
          reference: existingProduct.id,
        },
      });

      return updatedProduct;
    });

    return NextResponse.json({
      message: "Cost price updated successfully",
      product: {
        id: result.id,
        name: result.name,
        currentCostPrice: Number(result.currentCostPrice ?? 0),
      },
      note,
    });
  } catch (error) {
    console.error("POST /api/products/update-cost error:", error);

    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Failed to update cost price" },
      { status: 500 },
    );
  }
}
