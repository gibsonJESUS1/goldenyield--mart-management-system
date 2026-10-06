import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  findDuplicateProductByName,
} from "@/lib/db/product";

export async function POST(
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
      await prisma.product.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          name: true,
          active: true,
          currentCostPrice: true,

          saleUnits: {
            where: {
              active: true,
            },

            select: {
              id: true,
              isDefault: true,
            },
          },
        },
      });

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

    /*
     * Already active.
     * Treat this as successful.
     */
    if (product.active) {
      return NextResponse.json({
        success: true,
        restored: true,
        alreadyActive: true,
        warnings: [],
      });
    }

    /*
     * Do not restore if another product
     * with the same normalized name
     * already exists.
     */
    const duplicate =
      await findDuplicateProductByName(
        product.name,
        product.id,
      );

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            duplicate.active
              ? `"${duplicate.name}" already exists as an active product.`
              : `Another archived product named "${duplicate.name}" already exists.`,

          code:
            duplicate.active
              ? "DUPLICATE_ACTIVE_PRODUCT"
              : "DUPLICATE_ARCHIVED_PRODUCT",

          existingProduct: duplicate,
        },
        {
          status: 409,
        },
      );
    }

    const warnings: string[] = [];

    /*
     * We allow restoration even if the
     * product needs pricing work.
     *
     * The sale backend already prevents
     * unsafe sales.
     */
    if (
      product.currentCostPrice == null ||
      Number(
        product.currentCostPrice,
      ) <= 0
    ) {
      warnings.push(
        "Cost price is not set. Update the cost price before selling this product.",
      );
    }

    if (
      product.saleUnits.length ===
      0
    ) {
      warnings.push(
        "This product has no active selling unit. Edit the product before selling it.",
      );
    }

    const defaultUnits =
      product.saleUnits.filter(
        (saleUnit) =>
          saleUnit.isDefault,
      );

    if (
      product.saleUnits.length >
        0 &&
      defaultUnits.length !== 1
    ) {
      warnings.push(
        "The selling-unit setup should be reviewed before selling this product.",
      );
    }

    const restoredProduct =
      await prisma.product.update({
        where: {
          id,
        },

        data: {
          active: true,
        },

        select: {
          id: true,
          name: true,
          active: true,
        },
      });

    return NextResponse.json({
      success: true,
      restored: true,

      product:
        restoredProduct,

      warnings,
    });
  } catch (error) {
    console.error(
      "POST /api/products/[id]/restore error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to restore product",
      },
      {
        status: 500,
      },
    );
  }
}