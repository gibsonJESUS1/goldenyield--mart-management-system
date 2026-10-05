import { prisma } from "@/lib/prisma";

import {
  assertValidProductUnitConfiguration,
  ProductUnitConfigurationError,
} from "@/lib/product-unit-config";

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

export function normalizeProductName(name: string) {
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

      ownerId: data.ownerId,

      categoryId:
        data.categoryId,

      unitId:
        data.unitId,

      stock:
        data.stock,

      lowStock:
        data.lowStock,

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
            }),
          ),
      },

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
                priceRules: true,
              },
            },
          },
        });

      if (!existingProduct) {
        throw new Error(
          "Product not found",
        );
      }

      /*
       * Changing the base unit changes the meaning
       * of the stock quantity.
       *
       * We only allow it when current stock is zero.
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
              (unit) => unit.id,
            )
            .filter(
              (
                unitId,
              ): unitId is string =>
                Boolean(unitId),
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

          active:
            data.active ?? true,
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
          /*
           * Check whether this exact selling unit
           * has already appeared in historical sales.
           */
          const usageCount =
            await tx.saleItem.count({
              where: {
                saleUnitId:
                  saleUnit.id,
              },
            });

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

          /*
           * Unit identity and conversion can only be
           * rewritten when this selling unit has never
           * been used in a historical sale.
           *
           * Selling price can still change because old
           * SaleItems already store their historical
           * unit price.
           */
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
           * Price rules represent the current selling
           * configuration. Old sales already have their
           * historical prices stored in SaleItem.
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
                    (
                      rule,
                    ) => ({
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
        }
      }

      /*
       * Handle selling units removed from the editor.
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
          /*
           * Safe to physically remove because no
           * historical SaleItem references it.
           */
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
           * Preserve selling units that were used in
           * historical sales. They become inactive
           * instead of being deleted.
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
          },
        },
      );
    },

    /*
     * Neon is remote and this operation performs
     * multiple reads/writes.
     *
     * Prisma's default interactive transaction
     * timeout is only 5 seconds, which caused P2028.
     */
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
        id: productId,
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
        id: productId,
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
      createdAt: "desc",
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