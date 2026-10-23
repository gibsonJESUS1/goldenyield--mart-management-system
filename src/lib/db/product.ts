import { prisma } from "@/lib/prisma";

import {
  assertValidProductUnitConfiguration,
  ProductUnitConfigurationError,
} from "@/lib/product-unit-config";

import {
  assertSellingPricesNotBelowCost,
  ProductPricingError,
} from "@/lib/product-pricing";

export type CreatePriceRuleInput = {
  quantity: number;
  price: number;
  active?: boolean;
};

export type CreateProductSaleUnitInput = {
  unitId: string;
  quantityInBaseUnit: number;
  sellingPrice: number;
  isDefault?: boolean;
  active?: boolean;
  priceRules?: CreatePriceRuleInput[];
};

export type CreateProductInput = {
  name: string;
  ownerId: string;
  categoryId: string;
  unitId: string;
  stock: number;
  lowStock: number;

  // Cost of ONE base unit.
  currentCostPrice?: number | null;

  active?: boolean;
  saleUnits: CreateProductSaleUnitInput[];
};

export type UpdateProductInput = {
  name: string;
  ownerId: string;
  categoryId: string;
  unitId: string;
  stock: number;
  lowStock: number;

  // Cost of ONE base unit.
  currentCostPrice?: number | null;

  active?: boolean;

  saleUnits: Array<{
    id?: string;
    unitId: string;
    quantityInBaseUnit: number;
    sellingPrice: number;
    isDefault?: boolean;
    active?: boolean;
    priceRules?: CreatePriceRuleInput[];
  }>;
};

export type DuplicateProductInfo = {
  id: string;
  name: string;
  active: boolean;
};

export class DuplicateProductError extends Error {
  product: DuplicateProductInfo;

  constructor(product: DuplicateProductInfo) {
    super(
      product.active
        ? `Product "${product.name}" already exists.`
        : `Product "${product.name}" already exists but is archived.`,
    );

    this.name = "DuplicateProductError";
    this.product = product;
  }
}

export function normalizeProductName(
  name: string,
) {
  return name
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export async function findDuplicateProductByName(
  name: string,
  excludeProductId?: string,
): Promise<DuplicateProductInfo | null> {
  const normalizedName =
    normalizeProductName(name);

  if (!normalizedName) {
    return null;
  }

  const products =
    await prisma.product.findMany({
      where: excludeProductId
        ? {
            id: {
              not: excludeProductId,
            },
          }
        : undefined,

      select: {
        id: true,
        name: true,
        active: true,
      },
    });

  const duplicate =
    products.find(
      (product) =>
        normalizeProductName(
          product.name,
        ) === normalizedName,
    );

  return duplicate ?? null;
}

export async function getProducts() {
  return prisma.product.findMany({
    include: {
      owner: true,
      category: true,
      unit: true,

      saleUnits: {
        include: {
          unit: true,

          priceRules: {
            where: {
              active: true,
            },

            orderBy: {
              quantity: "desc",
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },
      },

      piecePriceOptions: {
        where: {
          active: true,
        },
        orderBy: [
          { sortOrder: "asc" },
          { sellingPrice: "asc" },
        ],
      },

      batches: {
        where: {
          status: {
            in: ["ACTIVE", "LOW"],
          },
        },
        orderBy: {
          startedAt: "desc",
        },
        take: 1,
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getProductById(
  id: string,
) {
  return prisma.product.findUnique({
    where: {
      id,
    },

    include: {
      owner: true,
      category: true,
      unit: true,

      saleUnits: {
        include: {
          unit: true,

          priceRules: {
            where: {
              active: true,
            },

            orderBy: {
              quantity: "desc",
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },
      },

      piecePriceOptions: {
        where: {
          active: true,
        },
        orderBy: [
          { sortOrder: "asc" },
          { sellingPrice: "asc" },
        ],
      },

      stockMovements: {
        orderBy: {
          createdAt: "desc",
        },

        take: 20,
      },
    },
  });
}

export async function createProduct(
  data: CreateProductInput,
) {
  const cleanedName =
    data.name
      .trim()
      .replace(/\s+/g, " ");

  assertValidProductUnitConfiguration(
    data.unitId,
    data.saleUnits,
  );

  const costPrice =
    data.currentCostPrice != null
      ? Number(
          data.currentCostPrice,
        )
      : null;

  if (
    costPrice != null &&
    (!Number.isFinite(costPrice) ||
      costPrice <= 0)
  ) {
    throw new ProductPricingError(
      "Cost price must be greater than zero.",
    );
  }

  /*
   * If we are introducing stock into the
   * system, we need to know what that stock
   * actually cost.
   */
  if (
    data.stock > 0 &&
    costPrice == null
  ) {
    throw new ProductPricingError(
      "Cost price is required when opening stock is greater than zero.",
    );
  }

  /*
   * Make sure every current selling price
   * is at least equal to the real cost of
   * the quantity being sold.
   */
  assertSellingPricesNotBelowCost(
    costPrice,
    data.saleUnits,
  );

  const duplicate =
    await findDuplicateProductByName(
      cleanedName,
    );

  if (duplicate) {
    throw new DuplicateProductError(
      duplicate,
    );
  }

  return prisma.product.create({
    data: {
      name: cleanedName,

      ownerId:
        data.ownerId,

      categoryId:
        data.categoryId,

      unitId:
        data.unitId,

      stock:
        data.stock,

      lowStock:
        data.lowStock,

      currentCostPrice:
        costPrice,

      active:
        data.active ?? true,

      saleUnits: {
        create:
          data.saleUnits.map(
            (saleUnit) => ({
              unitId:
                saleUnit.unitId,

              quantityInBaseUnit:
                saleUnit.quantityInBaseUnit,

              sellingPrice:
                saleUnit.sellingPrice,

              isDefault:
                saleUnit.isDefault ??
                false,

              active:
                saleUnit.active ??
                true,

              ...(saleUnit.priceRules &&
              saleUnit.priceRules
                .length > 0
                ? {
                    priceRules: {
                      create:
                        saleUnit.priceRules.map(
                          (rule) => ({
                            quantity:
                              rule.quantity,

                            price:
                              rule.price,

                            active:
                              rule.active ??
                              true,
                          }),
                        ),
                    },
                  }
                : {}),
            }),
          ),
      },

      /*
       * Opening stock movement.
       */
      ...(data.stock > 0
        ? {
            stockMovements: {
              create: {
                type: "IN",

                quantity:
                  data.stock,

                note:
                  "Initial stock",
              },
            },
          }
        : {}),

      /*
       * Record initial cost price in the
       * same history system used by later
       * cost-price changes.
       */
      ...(costPrice != null
        ? {
            costPriceHistories: {
              create: {
                newCostPrice:
                  costPrice,

                changeType:
                  "MANUAL_UPDATE",

                note:
                  "Initial product cost price",
              },
            },
          }
        : {}),
    },

    include: {
      owner: true,
      category: true,
      unit: true,

      saleUnits: {
        include: {
          unit: true,
          priceRules: true,
        },
      },
    },
  });
}

export async function updateProduct(
  id: string,
  data: UpdateProductInput,
) {
  const cleanedName =
    data.name
      .trim()
      .replace(/\s+/g, " ");

  assertValidProductUnitConfiguration(
    data.unitId,
    data.saleUnits,
  );

  const duplicate =
    await findDuplicateProductByName(
      cleanedName,
      id,
    );

  if (duplicate) {
    throw new DuplicateProductError(
      duplicate,
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const existingProduct =
        await tx.product.findUnique({
          where: {
            id,
          },

          include: {
            saleUnits: {
              include: {
                priceRules:
                  true,
              },
            },

            piecePriceOptions: {
              where: {
                active: true,
              },
            },
          },
        });

      if (!existingProduct) {
        throw new Error(
          "Product not found",
        );
      }

      const previousCostPrice =
        existingProduct.currentCostPrice != null
          ? Number(
              existingProduct.currentCostPrice,
            )
          : null;

      const baseUnitChanged =
        existingProduct.unitId !== data.unitId;

      const nextCostPrice =
        data.currentCostPrice !== undefined
          ? data.currentCostPrice
          : previousCostPrice;

      if (
        nextCostPrice != null &&
        (!Number.isFinite(nextCostPrice) ||
          nextCostPrice <= 0)
      ) {
        throw new ProductPricingError(
          "Cost price must be greater than zero.",
        );
      }

      if (
        data.stock > 0 &&
        nextCostPrice == null
      ) {
        throw new ProductPricingError(
          "Cost price is required when stock is greater than zero.",
        );
      }

      /*
       * Do not silently erase a valid cost price.
       * The one safe exception is when the base unit
       * itself changes while stock is zero, because the
       * old cost no longer describes the new base unit.
       */
      if (
        previousCostPrice != null &&
        data.currentCostPrice === null &&
        !baseUnitChanged
      ) {
        throw new ProductPricingError(
          "Existing cost price cannot be cleared. Enter the new cost price instead.",
        );
      }

      assertSellingPricesNotBelowCost(
        nextCostPrice,
        data.saleUnits,
      );

      /*
       * Manual variable-piece selling uses currentCostPrice
       * as the cost of one base piece. When configured
       * piece-price options exist, each option has its own
       * cost and this check does not apply.
       */
      if (
        existingProduct.allowVariablePiecePrice &&
        existingProduct.piecePriceOptions.length === 0 &&
        existingProduct.minPiecePrice != null &&
        nextCostPrice != null &&
        Number(existingProduct.minPiecePrice) <
          nextCostPrice
      ) {
        throw new ProductPricingError(
          `The new cost price ₦${nextCostPrice.toLocaleString()} is higher than the current minimum variable piece selling price of ₦${Number(
            existingProduct.minPiecePrice,
          ).toLocaleString()}. Update the Fish / Meat Selling minimum price first.`,
        );
      }

      const costPriceChanged =
        nextCostPrice != null &&
        (previousCostPrice == null ||
          Math.abs(
            nextCostPrice - previousCostPrice,
          ) > 0.001);

      /*
       * Changing the base unit changes what
       * Product.stock means.
       */
      if (
        existingProduct.unitId !==
          data.unitId &&
        existingProduct.stock !== 0
      ) {
        throw new ProductUnitConfigurationError(
          "Base stock unit cannot be changed while the product has stock. Reset or recount the product to zero first.",
        );
      }

      const existingSaleUnits =
        existingProduct.saleUnits;

      const existingSaleUnitIds =
        new Set(
          existingSaleUnits.map(
            (unit) => unit.id,
          ),
        );

      const incomingSaleUnitIds =
        new Set(
          data.saleUnits
            .map(
              (unit) =>
                unit.id,
            )
            .filter(
              (
                unitId,
              ): unitId is string =>
                Boolean(
                  unitId,
                ),
            ),
        );

      const removedSaleUnits =
        existingSaleUnits.filter(
          (unit) =>
            !incomingSaleUnitIds.has(
              unit.id,
            ),
        );

      await tx.product.update({
        where: {
          id,
        },

        data: {
          name:
            cleanedName,

          ownerId:
            data.ownerId,

          categoryId:
            data.categoryId,

          unitId:
            data.unitId,

          stock:
            data.stock,

          lowStock:
            data.lowStock,

          currentCostPrice:
            nextCostPrice,

          active:
            data.active ??
            true,

          ...(costPriceChanged &&
          nextCostPrice != null
            ? {
                costPriceHistories: {
                  create: {
                    oldCostPrice:
                      previousCostPrice,

                    newCostPrice:
                      nextCostPrice,

                    changeType:
                      "MANUAL_UPDATE",

                    note:
                      "Cost price updated from product edit form",
                  },
                },
              }
            : {}),
        },
      });

      /*
       * Update/create incoming selling units.
       */
      for (
        const saleUnit of
        data.saleUnits
      ) {
        if (
          saleUnit.id &&
          existingSaleUnitIds.has(
            saleUnit.id,
          )
        ) {
          const oldSaleUnit =
            existingSaleUnits.find(
              (existing) =>
                existing.id ===
                saleUnit.id,
            );

          if (!oldSaleUnit) {
            throw new Error(
              "Selling unit not found",
            );
          }

          const usageCount =
            await tx.saleItem.count({
              where: {
                saleUnitId:
                  saleUnit.id,
              },
            });

          const conversionChanged =
            oldSaleUnit.unitId !==
              saleUnit.unitId ||
            oldSaleUnit.quantityInBaseUnit !==
              saleUnit.quantityInBaseUnit;

          /*
           * IMPORTANT:
           *
           * If a selling unit was used in an
           * old sale, never rewrite its old
           * conversion.
           *
           * Deactivate the historical record
           * and create a new current record.
           */
          if (
            usageCount > 0 &&
            conversionChanged
          ) {
            await tx.productSaleUnit.update(
              {
                where: {
                  id:
                    oldSaleUnit.id,
                },

                data: {
                  active:
                    false,

                  isDefault:
                    false,
                },
              },
            );

            await tx.productSaleUnit.create(
              {
                data: {
                  productId:
                    id,

                  unitId:
                    saleUnit.unitId,

                  quantityInBaseUnit:
                    saleUnit.quantityInBaseUnit,

                  sellingPrice:
                    saleUnit.sellingPrice,

                  isDefault:
                    saleUnit.isDefault ??
                    false,

                  active:
                    saleUnit.active ??
                    true,

                  ...(saleUnit.priceRules &&
                  saleUnit.priceRules
                    .length > 0
                    ? {
                        priceRules: {
                          create:
                            saleUnit.priceRules.map(
                              (
                                rule,
                              ) => ({
                                quantity:
                                  rule.quantity,

                                price:
                                  rule.price,

                                active:
                                  rule.active ??
                                  true,
                              }),
                            ),
                        },
                      }
                    : {}),
                },
              },
            );

            continue;
          }

          /*
           * Historical unit identity/conversion
           * stays untouched if it was used.
           * Current selling price may change,
           * because SaleItem already snapshots
           * the old selling price.
           */
          const updateData: {
            unitId?: string;
            quantityInBaseUnit?: number;
            sellingPrice: number;
            isDefault: boolean;
            active: boolean;
          } = {
            sellingPrice:
              saleUnit.sellingPrice,

            isDefault:
              saleUnit.isDefault ??
              false,

            active:
              saleUnit.active ??
              true,
          };

          if (usageCount === 0) {
            updateData.unitId =
              saleUnit.unitId;

            updateData.quantityInBaseUnit =
              saleUnit.quantityInBaseUnit;
          }

          await tx.productSaleUnit.update(
            {
              where: {
                id:
                  saleUnit.id,
              },

              data:
                updateData,
            },
          );

          /*
           * Price rules are current commercial
           * rules. Historical sales already store
           * the actual amount sold.
           */
          await tx.productSaleUnitPriceRule.deleteMany(
            {
              where: {
                productSaleUnitId:
                  saleUnit.id,
              },
            },
          );

          if (
            saleUnit.priceRules &&
            saleUnit.priceRules
              .length > 0
          ) {
            await tx.productSaleUnitPriceRule.createMany(
              {
                data:
                  saleUnit.priceRules.map(
                    (rule) => ({
                      productSaleUnitId:
                        saleUnit.id!,

                      quantity:
                        rule.quantity,

                      price:
                        rule.price,

                      active:
                        rule.active ??
                        true,
                    }),
                  ),
              },
            );
          }
        } else {
          /*
           * Brand-new selling unit.
           */
          await tx.productSaleUnit.create(
            {
              data: {
                productId:
                  id,

                unitId:
                  saleUnit.unitId,

                quantityInBaseUnit:
                  saleUnit.quantityInBaseUnit,

                sellingPrice:
                  saleUnit.sellingPrice,

                isDefault:
                  saleUnit.isDefault ??
                  false,

                active:
                  saleUnit.active ??
                  true,

                ...(saleUnit.priceRules &&
                saleUnit.priceRules
                  .length > 0
                  ? {
                      priceRules: {
                        create:
                          saleUnit.priceRules.map(
                            (rule) => ({
                              quantity:
                                rule.quantity,

                              price:
                                rule.price,

                              active:
                                rule.active ??
                                true,
                            }),
                          ),
                      },
                    }
                  : {}),
              },
            },
          );
        }
      }

      /*
       * Selling units removed from the editor.
       */
      for (
        const removedSaleUnit of
        removedSaleUnits
      ) {
        const usageCount =
          await tx.saleItem.count({
            where: {
              saleUnitId:
                removedSaleUnit.id,
            },
          });

        if (usageCount === 0) {
          await tx.productSaleUnitPriceRule.deleteMany(
            {
              where: {
                productSaleUnitId:
                  removedSaleUnit.id,
              },
            },
          );

          await tx.productSaleUnit.delete(
            {
              where: {
                id:
                  removedSaleUnit.id,
              },
            },
          );
        } else {
          /*
           * Keep anything referenced by an
           * historical sale.
           */
          await tx.productSaleUnit.update(
            {
              where: {
                id:
                  removedSaleUnit.id,
              },

              data: {
                active:
                  false,

                isDefault:
                  false,
              },
            },
          );
        }
      }

      return tx.product.findUniqueOrThrow(
        {
          where: {
            id,
          },

          include: {
            owner: true,
            category: true,
            unit: true,

            saleUnits: {
              include: {
                unit: true,

                priceRules:
                  true,
              },

              orderBy: {
                createdAt:
                  "asc",
              },
            },

            piecePriceOptions: {
              where: {
                active: true,
              },
              orderBy: [
                { sortOrder: "asc" },
                { sellingPrice: "asc" },
              ],
            },
          },
        },
      );
    },

    {
      maxWait: 10000,
      timeout: 30000,
    },
  );
}

export async function reduceProductStock(
  productId: string,
  quantityToReduce: number,
) {
  const product =
    await prisma.product.findUnique({
      where: {
        id:
          productId,
      },
    });

  if (!product) {
    throw new Error(
      "Product not found",
    );
  }

  if (
    product.stock <
    quantityToReduce
  ) {
    throw new Error(
      "Insufficient stock",
    );
  }

  return prisma.product.update({
    where: {
      id:
        productId,
    },

    data: {
      stock:
        product.stock -
        quantityToReduce,

      stockMovements: {
        create: {
          type: "OUT",

          quantity:
            quantityToReduce,

          note:
            "Stock reduced from sale",
        },
      },
    },
  });
}

export async function restockProduct(
  productId: string,
  quantityToAdd: number,
  note?: string,
) {
  const product =
    await prisma.product.findUnique({
      where: {
        id:
          productId,
      },
    });

  if (!product) {
    throw new Error(
      "Product not found",
    );
  }

  if (quantityToAdd <= 0) {
    throw new Error(
      "Quantity must be greater than zero",
    );
  }

  return prisma.product.update({
    where: {
      id:
        productId,
    },

    data: {
      stock:
        product.stock +
        quantityToAdd,

      stockMovements: {
        create: {
          type: "IN",

          quantity:
            quantityToAdd,

          note:
            note ||
            "Manual restock",
        },
      },
    },

    include: {
      owner: true,
      category: true,
      unit: true,
    },
  });
}

export async function getStockMovements() {
  return prisma.stockMovement.findMany({
    include: {
      product: {
        include: {
          owner: true,
          category: true,
          unit: true,
        },
      },
    },

    orderBy: {
      createdAt:
        "desc",
    },
  });
}

export async function deleteProduct(
  id: string,
) {
  return prisma.product.delete({
    where: {
      id,
    },
  });
}