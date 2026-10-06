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

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await params;

    const product =
      await getProductById(id);

    if (!product) {
      return NextResponse.json(
        {
          error: "Product not found",
        },
        {
          status: 404,
        },
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

      createdAt: product.createdAt,
      updatedAt: product.updatedAt,

      saleUnits:
        product.saleUnits.map(
          (saleUnit) => ({
            id:
              saleUnit.id,

            unitId:
              saleUnit.unitId,

            unitName:
              saleUnit.unit.name,

            quantityInBaseUnit:
              saleUnit.quantityInBaseUnit,

            sellingPrice:
              Number(
                saleUnit.sellingPrice,
              ),

            isDefault:
              saleUnit.isDefault,

            active:
              saleUnit.active,

            priceRules:
              saleUnit.priceRules.map(
                (rule) => ({
                  id:
                    rule.id,

                  quantity:
                    rule.quantity,

                  price:
                    Number(
                      rule.price,
                    ),

                  active:
                    rule.active,
                }),
              ),
          }),
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/products/[id] error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch product",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
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
      typeof body.stock !==
        "number" ||
      typeof body.lowStock !==
        "number" ||
      !Array.isArray(
        body.saleUnits,
      ) ||
      body.saleUnits.length ===
        0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid product payload",
        },
        {
          status: 400,
        },
      );
    }

    const product =
      await updateProduct(
        id,
        body,
      );

    return NextResponse.json({
      id:
        product.id,

      name:
        product.name,

      ownerId:
        product.ownerId,

      ownerName:
        product.owner.name,

      categoryId:
        product.categoryId,

      category:
        product.category.name,

      unitId:
        product.unitId,

      unit:
        product.unit.name,

      stock:
        product.stock,

      lowStock:
        product.lowStock,

      active:
        product.active,

      createdAt:
        product.createdAt,

      updatedAt:
        product.updatedAt,

      saleUnits:
        product.saleUnits.map(
          (saleUnit) => ({
            id:
              saleUnit.id,

            unitId:
              saleUnit.unitId,

            unitName:
              saleUnit.unit.name,

            quantityInBaseUnit:
              saleUnit.quantityInBaseUnit,

            sellingPrice:
              Number(
                saleUnit.sellingPrice,
              ),

            isDefault:
              saleUnit.isDefault,

            active:
              saleUnit.active,

            priceRules:
              saleUnit.priceRules.map(
                (rule) => ({
                  id:
                    rule.id,

                  quantity:
                    rule.quantity,

                  price:
                    Number(
                      rule.price,
                    ),

                  active:
                    rule.active,
                }),
              ),
          }),
        ),
    });
  } catch (error) {
    console.error(
      "PATCH /api/products/[id] error:",
      error,
    );

    /*
     * Duplicate product protection.
     */
    if (
      error instanceof
      DuplicateProductError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,

          code:
            error.product.active
              ? "DUPLICATE_ACTIVE_PRODUCT"
              : "DUPLICATE_ARCHIVED_PRODUCT",

          existingProduct: {
            id:
              error.product.id,

            name:
              error.product.name,

            active:
              error.product.active,
          },
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Invalid base-unit /
     * selling-unit configuration.
     */
    if (
      error instanceof
      ProductUnitConfigurationError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,

          code:
            "INVALID_PRODUCT_UNIT_CONFIGURATION",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Cost / selling-price protection.
     */
    if (
      error instanceof
      ProductPricingError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,

          code:
            "INVALID_PRODUCT_PRICING",

          warnings:
            error.warnings,
        },
        {
          status: 400,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "Product not found"
    ) {
      return NextResponse.json(
        {
          error:
            "Product not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to update product",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * DELETE now means ARCHIVE.
 *
 * We do not physically delete Product
 * records because sales, stock movements,
 * purchases and cost history may depend
 * on them.
 */
export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } =
      await params;

    const product =
      await prisma.product.findUnique(
        {
          where: {
            id,
          },

          select: {
            id: true,
            name: true,
            stock: true,
            active: true,
          },
        },
      );

    if (!product) {
      return NextResponse.json(
        {
          error:
            "Product not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Already archived.
     * Treat this as a successful
     * idempotent request.
     */
    if (!product.active) {
      return NextResponse.json({
        success: true,
        archived: true,
      });
    }

    /*
     * Never archive stock that still
     * physically exists.
     */
    if (
      product.stock !== 0
    ) {
      return NextResponse.json(
        {
          error:
            `"${product.name}" still has ${product.stock} base units in stock. ` +
            "Reduce, sell, or recount the stock to 0 before archiving it.",

          code:
            "PRODUCT_HAS_STOCK",
        },
        {
          status: 409,
        },
      );
    }

    await prisma.product.update({
      where: {
        id,
      },

      data: {
        active: false,
      },
    });

    return NextResponse.json({
      success: true,
      archived: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/products/[id] error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to archive product",
      },
      {
        status: 500,
      },
    );
  }
}