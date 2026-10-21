import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function optionalPositiveNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : Number.NaN;
}

function isPieceUnit(name: string, symbol?: string | null) {
  const n = name.trim().toLowerCase();
  const s = symbol?.trim().toLowerCase() ?? "";

  return (
    n === "piece" ||
    n === "pieces" ||
    n === "peice" ||
    n === "peices" ||
    n === "pcs" ||
    s === "pc" ||
    s === "pcs"
  );
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      weightTrackingEnabled?: boolean;
      weightStockGrams?: number;
      lowWeightStockGrams?: number;
      costPerKg?: number | null;
      pricePerKg?: number | null;
      allowVariablePiecePrice?: boolean;
      minPiecePrice?: number | null;
      maxPiecePrice?: number | null;
    };

    const product = await prisma.product.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const weightTrackingEnabled = body.weightTrackingEnabled === true;
    const allowVariablePiecePrice = body.allowVariablePiecePrice === true;

    const weightStockGrams = Number(body.weightStockGrams ?? 0);
    const lowWeightStockGrams = Number(body.lowWeightStockGrams ?? 0);

    if (!Number.isInteger(weightStockGrams) || weightStockGrams < 0) {
      return NextResponse.json(
        { error: "Weight stock must be a valid gram quantity of 0 or more." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(lowWeightStockGrams) || lowWeightStockGrams < 0) {
      return NextResponse.json(
        { error: "Low-weight threshold must be a valid gram quantity of 0 or more." },
        { status: 400 },
      );
    }

    const costPerKg = optionalPositiveNumber(body.costPerKg);
    const pricePerKg = optionalPositiveNumber(body.pricePerKg);

    if (Number.isNaN(costPerKg)) {
      return NextResponse.json(
        { error: "Cost per kg must be greater than zero." },
        { status: 400 },
      );
    }

    if (Number.isNaN(pricePerKg)) {
      return NextResponse.json(
        { error: "Selling price per kg must be greater than zero." },
        { status: 400 },
      );
    }

    if (weightTrackingEnabled) {
      if (pricePerKg == null) {
        return NextResponse.json(
          { error: "Selling price per kg is required when weight selling is enabled." },
          { status: 400 },
        );
      }

      if (weightStockGrams > 0 && costPerKg == null) {
        return NextResponse.json(
          { error: "Cost per kg is required when weight stock is greater than zero." },
          { status: 400 },
        );
      }

      if (costPerKg != null && pricePerKg < costPerKg) {
        return NextResponse.json(
          { error: "Selling price per kg cannot be below the cost per kg." },
          { status: 400 },
        );
      }
    }

    const minPiecePrice = optionalPositiveNumber(body.minPiecePrice);
    const maxPiecePrice = optionalPositiveNumber(body.maxPiecePrice);

    if (Number.isNaN(minPiecePrice)) {
      return NextResponse.json(
        { error: "Minimum piece price must be greater than zero." },
        { status: 400 },
      );
    }

    if (Number.isNaN(maxPiecePrice)) {
      return NextResponse.json(
        { error: "Maximum piece price must be greater than zero." },
        { status: 400 },
      );
    }

    if (allowVariablePiecePrice) {
      if (!isPieceUnit(product.unit.name, product.unit.symbol)) {
        return NextResponse.json(
          {
            error:
              `Variable piece pricing requires the product base unit to be Piece/Pieces. ` +
              `Current base unit is "${product.unit.name}".`,
          },
          { status: 400 },
        );
      }

      if (minPiecePrice == null || maxPiecePrice == null) {
        return NextResponse.json(
          { error: "Enter both the normal minimum and maximum piece prices." },
          { status: 400 },
        );
      }

      if (minPiecePrice > maxPiecePrice) {
        return NextResponse.json(
          { error: "Minimum piece price cannot be greater than maximum piece price." },
          { status: 400 },
        );
      }

      const pieceCost =
        product.currentCostPrice != null ? Number(product.currentCostPrice) : null;

      if (pieceCost == null || !Number.isFinite(pieceCost) || pieceCost <= 0) {
        return NextResponse.json(
          { error: "Set a valid cost price per piece before enabling variable piece selling." },
          { status: 400 },
        );
      }

      if (minPiecePrice < pieceCost) {
        return NextResponse.json(
          { error: "The normal minimum piece price cannot be below the current cost per piece." },
          { status: 400 },
        );
      }
    }

    const previousWeightStock = product.weightStockGrams;

    const updated = await prisma.$transaction(
      async (tx) => {
        const saved = await tx.product.update({
          where: { id },
          data: {
            weightTrackingEnabled,
            weightStockGrams: weightTrackingEnabled ? weightStockGrams : 0,
            lowWeightStockGrams: weightTrackingEnabled ? lowWeightStockGrams : 0,
            costPerKg: weightTrackingEnabled ? costPerKg : null,
            pricePerKg: weightTrackingEnabled ? pricePerKg : null,
            allowVariablePiecePrice,
            minPiecePrice: allowVariablePiecePrice ? minPiecePrice : null,
            maxPiecePrice: allowVariablePiecePrice ? maxPiecePrice : null,
          },
          include: { unit: true },
        });

        const nextWeightStock = weightTrackingEnabled ? weightStockGrams : 0;
        const difference = nextWeightStock - previousWeightStock;

        if (difference !== 0) {
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: difference > 0 ? "IN" : "OUT",
              quantity: Math.abs(difference),
              bucket: "WEIGHT_GRAMS",
              note:
                `Flexible-sale weight stock setup: ` +
                `${(previousWeightStock / 1000).toFixed(3)}kg → ` +
                `${(nextWeightStock / 1000).toFixed(3)}kg`,
            },
          });
        }

        return saved;
      },
      { maxWait: 10000, timeout: 30000 },
    );

    return NextResponse.json({
      success: true,
      product: {
        id: updated.id,
        name: updated.name,
        unit: updated.unit.name,
        stock: updated.stock,
        currentCostPrice:
          updated.currentCostPrice != null ? Number(updated.currentCostPrice) : null,
        weightTrackingEnabled: updated.weightTrackingEnabled,
        weightStockGrams: updated.weightStockGrams,
        lowWeightStockGrams: updated.lowWeightStockGrams,
        costPerKg: updated.costPerKg != null ? Number(updated.costPerKg) : null,
        pricePerKg: updated.pricePerKg != null ? Number(updated.pricePerKg) : null,
        allowVariablePiecePrice: updated.allowVariablePiecePrice,
        minPiecePrice:
          updated.minPiecePrice != null ? Number(updated.minPiecePrice) : null,
        maxPiecePrice:
          updated.maxPiecePrice != null ? Number(updated.maxPiecePrice) : null,
      },
    });
  } catch (error) {
    console.error("PATCH /api/products/[id]/flexible-config error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save flexible sale setup.",
      },
      { status: 500 },
    );
  }
}
