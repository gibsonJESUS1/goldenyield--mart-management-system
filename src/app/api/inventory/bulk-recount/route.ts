import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RecountItem = {
  productId: string;
  expectedCurrentStock: number;
  countedStock: number;
};

class StockTakeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockTakeConflictError";
  }
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as {
        items?: RecountItem[];
        note?: string;
      };

    if (
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one product recount is required.",
        },
        {
          status: 400,
        },
      );
    }

    const seenProductIds =
      new Set<string>();

    for (const item of body.items) {
      if (
        !item.productId ||
        typeof item.productId !==
          "string"
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid product in stock take.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        seenProductIds.has(
          item.productId,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "A product appears more than once in this stock take.",
          },
          {
            status: 400,
          },
        );
      }

      seenProductIds.add(
        item.productId,
      );

      if (
        !Number.isInteger(
          item.expectedCurrentStock,
        ) ||
        item.expectedCurrentStock <
          0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid current stock value.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !Number.isInteger(
          item.countedStock,
        ) ||
        item.countedStock < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Physical stock count must be a whole number of 0 or more.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const note =
      typeof body.note === "string" &&
      body.note.trim()
        ? body.note.trim()
        : "Bulk stock take / recount";

    const result =
      await prisma.$transaction(
        async (tx) => {
          const productIds =
            body.items!.map(
              (item) =>
                item.productId,
            );

          const products =
            await tx.product.findMany({
              where: {
                id: {
                  in:
                    productIds,
                },

                active:
                  true,
              },

              select: {
                id: true,
                name: true,
                stock: true,
              },
            });

          const productMap =
            new Map(
              products.map(
                (product) => [
                  product.id,
                  product,
                ],
              ),
            );

          if (
            products.length !==
            productIds.length
          ) {
            throw new Error(
              "One or more products are missing or archived.",
            );
          }

          let changedProducts =
            0;

          let increasedBy =
            0;

          let decreasedBy =
            0;

          for (
            const item of
            body.items!
          ) {
            const product =
              productMap.get(
                item.productId,
              );

            if (!product) {
              throw new Error(
                "Product not found.",
              );
            }

            /*
             * The stock may have changed
             * since the stock-take page
             * was loaded.
             */
            if (
              product.stock !==
              item.expectedCurrentStock
            ) {
              throw new StockTakeConflictError(
                `"${product.name}" stock changed while the stock take was open. ` +
                  `The system now has ${product.stock}. Refresh inventory before applying the recount.`,
              );
            }

            const difference =
              item.countedStock -
              product.stock;

            /*
             * User may have entered the
             * same number as system stock.
             * Nothing needs changing.
             */
            if (
              difference === 0
            ) {
              continue;
            }

            /*
             * Extra concurrency protection:
             * only update if stock is STILL
             * what the stock-take screen saw.
             */
            const updateResult =
              await tx.product.updateMany(
                {
                  where: {
                    id:
                      product.id,

                    active:
                      true,

                    stock:
                      item.expectedCurrentStock,
                  },

                  data: {
                    stock:
                      item.countedStock,
                  },
                },
              );

            if (
              updateResult.count !==
              1
            ) {
              throw new StockTakeConflictError(
                `"${product.name}" changed while the stock take was being saved. Refresh inventory and try again.`,
              );
            }

            await tx.stockMovement.create(
              {
                data: {
                  productId:
                    product.id,

                  type:
                    difference > 0
                      ? "IN"
                      : "OUT",

                  quantity:
                    Math.abs(
                      difference,
                    ),

                  note:
                    `${note} — system ${product.stock}, counted ${item.countedStock}`,
                },
              },
            );

            changedProducts +=
              1;

            if (
              difference > 0
            ) {
              increasedBy +=
                difference;
            } else {
              decreasedBy +=
                Math.abs(
                  difference,
                );
            }
          }

          return {
            changedProducts,
            increasedBy,
            decreasedBy,
          };
        },
        {
          maxWait: 10000,
          timeout: 30000,
        },
      );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "POST /api/inventory/bulk-recount error:",
      error,
    );

    if (
      error instanceof
      StockTakeConflictError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,

          code:
            "STOCK_CHANGED",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete stock take.",
      },
      {
        status: 500,
      },
    );
  }
}