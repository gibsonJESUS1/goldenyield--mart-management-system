import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  DuplicateProductError,
  getProductById,
  updateProduct,
} from "@/lib/db/product";

import {
  ProductUnitConfigurationError,
} from "@/lib/product-unit-config";

import {
  ProductPricingError,
} from "@/lib/product-pricing";

function flexibleFields(product: {
  currentCostPrice: unknown;
  weightTrackingEnabled: boolean;
  weightStockGrams: number;
  lowWeightStockGrams: number;
  costPerKg: unknown;
  pricePerKg: unknown;
  allowVariablePiecePrice: boolean;
  minPiecePrice: unknown;
  maxPiecePrice: unknown;
}) {
  return {
    currentCostPrice:
      product.currentCostPrice != null
        ? Number(product.currentCostPrice)
        : null,

    weightTrackingEnabled:
      product.weightTrackingEnabled,

    weightStockGrams:
      product.weightStockGrams,

    lowWeightStockGrams:
      product.lowWeightStockGrams,

    costPerKg:
      product.costPerKg != null
        ? Number(product.costPerKg)
        : null,

    pricePerKg:
      product.pricePerKg != null
        ? Number(product.pricePerKg)
        : null,

    allowVariablePiecePrice:
      product.allowVariablePiecePrice,

    minPiecePrice:
      product.minPiecePrice != null
        ? Number(product.minPiecePrice)
        : null,

    maxPiecePrice:
      product.maxPiecePrice != null
        ? Number(product.maxPiecePrice)
        : null,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,

      ownerId: product.ownerId,
      ownerName: product.owner.name,

      categoryId: product.categoryId,
      category: product.category.name,

      unitId: product.unitId,
      unit: product.unit.name,

      stock: product.stock,
      lowStock: product.lowStock,

      active: product.active,

      ...flexibleFields(product),

      piecePriceOptions: product.piecePriceOptions.map((option) => ({
        id: option.id,
        label: option.label,
        sellingPrice: Number(option.sellingPrice),
        costPrice: Number(option.costPrice),
        active: option.active,
        sortOrder: option.sortOrder,
      })),

      createdAt: product.createdAt,
      updatedAt: product.updatedAt,

      saleUnits: product.saleUnits.map((saleUnit) => ({
        id: saleUnit.id,
        unitId: saleUnit.unitId,
        unitName: saleUnit.unit.name,
        quantityInBaseUnit: saleUnit.quantityInBaseUnit,
        sellingPrice: Number(saleUnit.sellingPrice),
        isDefault: saleUnit.isDefault,
        active: saleUnit.active,
        priceRules: saleUnit.priceRules.map((rule) => ({
          id: rule.id,
          quantity: rule.quantity,
          price: Number(rule.price),
          active: rule.active,
        })),
      })),
    });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const body =
      (await request.json()) as {
        name: string;
        ownerId: string;
        categoryId: string;
        unitId: string;
        stock: number;
        lowStock: number;
        currentCostPrice?: number | null;
        active?: boolean;

        saleUnits: Array<{
          id?: string;
          unitId: string;
          quantityInBaseUnit: number;
          sellingPrice: number;
          isDefault?: boolean;
          active?: boolean;

          priceRules?: Array<{
            quantity: number;
            price: number;
            active?: boolean;
          }>;
        }>;
      };

    if (
      !body.name?.trim() ||
      !body.ownerId ||
      !body.categoryId ||
      !body.unitId ||
      typeof body.stock !== "number" ||
      typeof body.lowStock !== "number" ||
      !Array.isArray(body.saleUnits) ||
      body.saleUnits.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid product payload" },
        { status: 400 },
      );
    }

    if (
      body.currentCostPrice != null &&
      (typeof body.currentCostPrice !== "number" ||
        !Number.isFinite(body.currentCostPrice) ||
        body.currentCostPrice <= 0)
    ) {
      return NextResponse.json(
        { error: "Cost price must be greater than zero." },
        { status: 400 },
      );
    }

    const product = await updateProduct(id, body);

    return NextResponse.json({
      id: product.id,
      name: product.name,

      ownerId: product.ownerId,
      ownerName: product.owner.name,

      categoryId: product.categoryId,
      category: product.category.name,

      unitId: product.unitId,
      unit: product.unit.name,

      stock: product.stock,
      lowStock: product.lowStock,

      active: product.active,

      ...flexibleFields(product),

      piecePriceOptions: product.piecePriceOptions.map((option) => ({
        id: option.id,
        label: option.label,
        sellingPrice: Number(option.sellingPrice),
        costPrice: Number(option.costPrice),
        active: option.active,
        sortOrder: option.sortOrder,
      })),

      createdAt: product.createdAt,
      updatedAt: product.updatedAt,

      saleUnits: product.saleUnits.map((saleUnit) => ({
        id: saleUnit.id,
        unitId: saleUnit.unitId,
        unitName: saleUnit.unit.name,
        quantityInBaseUnit: saleUnit.quantityInBaseUnit,
        sellingPrice: Number(saleUnit.sellingPrice),
        isDefault: saleUnit.isDefault,
        active: saleUnit.active,
        priceRules: saleUnit.priceRules.map((rule) => ({
          id: rule.id,
          quantity: rule.quantity,
          price: Number(rule.price),
          active: rule.active,
        })),
      })),
    });
  } catch (error) {
    console.error("PATCH /api/products/[id] error:", error);

    if (error instanceof DuplicateProductError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.product.active
            ? "DUPLICATE_ACTIVE_PRODUCT"
            : "DUPLICATE_ARCHIVED_PRODUCT",
          existingProduct: {
            id: error.product.id,
            name: error.product.name,
            active: error.product.active,
          },
        },
        { status: 409 },
      );
    }

    if (error instanceof ProductUnitConfigurationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "INVALID_PRODUCT_UNIT_CONFIGURATION",
        },
        { status: 400 },
      );
    }

    if (error instanceof ProductPricingError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "INVALID_PRODUCT_PRICING",
          warnings: error.warnings,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "Product not found") {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

/*
 * DELETE means ARCHIVE.
 * Both count stock and weight stock must be zero first.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        stock: true,
        weightStockGrams: true,
        active: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    if (!product.active) {
      return NextResponse.json({
        success: true,
        archived: true,
      });
    }

    if (product.stock !== 0 || product.weightStockGrams !== 0) {
      const parts: string[] = [];

      if (product.stock !== 0) {
        parts.push(`${product.stock} count/base unit(s)`);
      }

      if (product.weightStockGrams !== 0) {
        parts.push(`${(product.weightStockGrams / 1000).toFixed(3)}kg weight stock`);
      }

      return NextResponse.json(
        {
          error:
            `"${product.name}" still has ${parts.join(" and ")}. ` +
            "Reduce, sell, or recount all stock to 0 before archiving it.",
          code: "PRODUCT_HAS_STOCK",
        },
        { status: 409 },
      );
    }

    await prisma.product.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({
      success: true,
      archived: true,
    });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to archive product" },
      { status: 500 },
    );
  }
}
