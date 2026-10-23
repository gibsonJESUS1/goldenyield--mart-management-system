import { NextResponse } from "next/server";

import {
  createProduct,
  DuplicateProductError,
  getProducts,
} from "@/lib/db/product";

import {
  ProductUnitConfigurationError,
} from "@/lib/product-unit-config";

import {
  ProductPricingError,
} from "@/lib/product-pricing";

export async function GET() {
  try {
    const products = await getProducts();

    const normalized = products.map((product) => ({
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

      weightTrackingEnabled: product.weightTrackingEnabled,
      weightStockGrams: product.weightStockGrams,
      lowWeightStockGrams: product.lowWeightStockGrams,

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

      piecePriceOptions: product.piecePriceOptions.map((option) => ({
        id: option.id,
        label: option.label,
        sellingPrice: Number(option.sellingPrice),
        costPrice: Number(option.costPrice),
        active: option.active,
        sortOrder: option.sortOrder,
      })),

      activeBatch: product.batches[0]
        ? {
            id: product.batches[0].id,
            containerType: product.batches[0].containerType,
            reference: product.batches[0].reference,
            status: product.batches[0].status,
            startedAt: product.batches[0].startedAt,
          }
        : null,

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
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("GET /api/products error:", error);

    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
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

    const product = await createProduct(body);

    return NextResponse.json(
      {
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

        weightTrackingEnabled: product.weightTrackingEnabled,
        weightStockGrams: product.weightStockGrams,
        lowWeightStockGrams: product.lowWeightStockGrams,

        costPerKg:
          product.costPerKg != null ? Number(product.costPerKg) : null,

        pricePerKg:
          product.pricePerKg != null ? Number(product.pricePerKg) : null,

        allowVariablePiecePrice: product.allowVariablePiecePrice,

        minPiecePrice:
          product.minPiecePrice != null ? Number(product.minPiecePrice) : null,

        maxPiecePrice:
          product.maxPiecePrice != null ? Number(product.maxPiecePrice) : null,

        piecePriceOptions: [],
        activeBatch: null,

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
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/products error:", error);

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

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create product",
      },
      { status: 500 },
    );
  }
}
