import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type GetSalesFilters = {
  startDate?: Date;
  endDate?: Date;
};

type CreateSaleWithInventoryInput = {
  customerName?: string;

  /*
   * Sent by the client only so we can detect
   * whether prices changed after the cashier
   * loaded the page.
   *
   * The server does NOT trust this as the
   * authoritative sale total.
   */
  clientSubtotal?: number;

  amountPaid: number;

  items: Array<{
    productId: string;
    productSaleUnitId: string;
    quantity: number;
  }>;
};

export type SaleProtectionCode =
  | "PRODUCT_NOT_AVAILABLE"
  | "SELLING_UNIT_NOT_AVAILABLE"
  | "PRODUCT_COST_MISSING"
  | "SELLING_PRICE_BELOW_COST"
  | "INSUFFICIENT_STOCK"
  | "PRICE_CHANGED"
  | "INVALID_PAYMENT";

export class SaleProtectionError extends Error {
  code: SaleProtectionCode;

  constructor(
    code: SaleProtectionCode,
    message: string,
  ) {
    super(message);

    this.name =
      "SaleProtectionError";

    this.code = code;
  }
}

function roundMoney(
  value: number,
) {
  return Math.round(
    (value +
      Number.EPSILON) *
      100,
  ) / 100;
}

function toDecimal(
  value: number,
) {
  if (
    !Number.isFinite(value)
  ) {
    return new Prisma.Decimal(
      0,
    );
  }

  return new Prisma.Decimal(
    roundMoney(
      value,
    ).toFixed(2),
  );
}

type PriceRuleRow = {
  quantity: number;
  price: number;
  active: boolean;
};

/*
 * Same pricing behaviour as the cashier UI:
 *
 * Example:
 * normal piece = ₦50
 * 2 pieces = ₦90
 *
 * Quantity 5 becomes:
 * 2 + 2 + 1
 * ₦90 + ₦90 + ₦50
 */
function calculateBestFitTotal(
  quantity: number,
  normalSellingPrice: number,
  priceRules: PriceRuleRow[],
) {
  const activeRules =
    [...priceRules]
      .filter(
        (rule) =>
          rule.active &&
          Number.isInteger(
            rule.quantity,
          ) &&
          rule.quantity > 0 &&
          Number.isFinite(
            rule.price,
          ) &&
          rule.price >= 0,
      )
      .sort(
        (a, b) =>
          b.quantity -
          a.quantity,
      );

  if (
    activeRules.length === 0
  ) {
    return roundMoney(
      quantity *
        normalSellingPrice,
    );
  }

  let remaining =
    quantity;

  let total = 0;

  for (
    const rule of
    activeRules
  ) {
    const count =
      Math.floor(
        remaining /
          rule.quantity,
      );

    if (count > 0) {
      total +=
        count *
        rule.price;

      remaining -=
        count *
        rule.quantity;
    }
  }

  if (remaining > 0) {
    total +=
      remaining *
      normalSellingPrice;
  }

  return roundMoney(
    total,
  );
}

export async function getSales(
  filters: GetSalesFilters = {},
) {
  return prisma.sale.findMany({
    where:
      filters.startDate ||
      filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate
                ? {
                    gte:
                      filters.startDate,
                  }
                : {}),

              ...(filters.endDate
                ? {
                    lt:
                      filters.endDate,
                  }
                : {}),
            },
          }
        : undefined,

    include: {
      items: {
        include: {
          product: {
            include: {
              owner: true,
            },
          },

          saleUnit: {
            include: {
              unit: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt:
        "desc",
    },
  });
}

export async function createSaleWithInventory(
  input: CreateSaleWithInventoryInput,
) {
  if (
    !Array.isArray(
      input.items,
    ) ||
    input.items.length === 0
  ) {
    throw new Error(
      "At least one sale item is required",
    );
  }

  for (
    const item of
    input.items
  ) {
    if (
      !item.productId ||
      !item.productSaleUnitId
    ) {
      throw new Error(
        "Invalid sale item",
      );
    }

    if (
      !Number.isInteger(
        item.quantity,
      ) ||
      item.quantity <= 0
    ) {
      throw new Error(
        "Invalid quantity",
      );
    }
  }

  const requestedAmountPaid =
    Number(
      input.amountPaid,
    );

  if (
    !Number.isFinite(
      requestedAmountPaid,
    ) ||
    requestedAmountPaid < 0
  ) {
    throw new SaleProtectionError(
      "INVALID_PAYMENT",
      "Invalid amount paid.",
    );
  }

  const productIds = [
    ...new Set(
      input.items.map(
        (item) =>
          item.productId,
      ),
    ),
  ];

  const saleUnitIds = [
    ...new Set(
      input.items.map(
        (item) =>
          item.productSaleUnitId,
      ),
    ),
  ];

  return prisma.$transaction(
    async (tx) => {
      /*
       * IMPORTANT:
       * Cost price never goes to the cashier.
       *
       * It is fetched only inside the
       * server-side sale operation.
       */
      const [
        products,
        saleUnits,
      ] = await Promise.all([
        tx.product.findMany({
          where: {
            id: {
              in:
                productIds,
            },
          },

          select: {
            id: true,
            name: true,
            stock: true,
            active: true,
            currentCostPrice:
              true,
          },
        }),

        tx.productSaleUnit.findMany(
          {
            where: {
              id: {
                in:
                  saleUnitIds,
              },
            },

            select: {
              id: true,
              productId: true,

              quantityInBaseUnit:
                true,

              sellingPrice:
                true,

              active: true,

              unit: {
                select: {
                  name: true,
                },
              },

              priceRules: {
                where: {
                  active:
                    true,
                },

                select: {
                  quantity:
                    true,

                  price:
                    true,

                  active:
                    true,
                },

                orderBy: {
                  quantity:
                    "desc",
                },
              },
            },
          },
        ),
      ]);

      const productMap =
        new Map(
          products.map(
            (product) => [
              product.id,
              {
                id:
                  product.id,

                name:
                  product.name,

                stock:
                  product.stock,

                active:
                  product.active,

                currentCostPrice:
                  product.currentCostPrice !=
                  null
                    ? Number(
                        product.currentCostPrice,
                      )
                    : null,
              },
            ],
          ),
        );

      const saleUnitMap =
        new Map(
          saleUnits.map(
            (saleUnit) => [
              saleUnit.id,
              {
                id:
                  saleUnit.id,

                productId:
                  saleUnit.productId,

                unitName:
                  saleUnit.unit
                    .name,

                quantityInBaseUnit:
                  saleUnit.quantityInBaseUnit,

                sellingPrice:
                  Number(
                    saleUnit.sellingPrice,
                  ),

                active:
                  saleUnit.active,

                priceRules:
                  saleUnit.priceRules.map(
                    (
                      rule,
                    ) => ({
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
              },
            ],
          ),
        );

      /*
       * These are the authoritative
       * sale lines.
       *
       * Nothing relating to price,
       * conversion or total is trusted
       * from the browser.
       */
      const preparedItems =
        input.items.map(
          (item) => {
            const product =
              productMap.get(
                item.productId,
              );

            if (
              !product ||
              !product.active
            ) {
              throw new SaleProtectionError(
                "PRODUCT_NOT_AVAILABLE",
                "This product is not currently available for sale.",
              );
            }

            const saleUnit =
              saleUnitMap.get(
                item.productSaleUnitId,
              );

            if (
              !saleUnit ||
              !saleUnit.active ||
              saleUnit.productId !==
                product.id
            ) {
              throw new SaleProtectionError(
                "SELLING_UNIT_NOT_AVAILABLE",
                `${product.name}: this selling option is no longer available. Refresh the page and try again.`,
              );
            }

            const costPerBaseUnit =
              product.currentCostPrice;

            /*
             * If cost is unknown we cannot
             * safely determine whether this
             * is a profitable sale.
             */
            if (
              costPerBaseUnit ==
                null ||
              !Number.isFinite(
                costPerBaseUnit,
              ) ||
              costPerBaseUnit <=
                0
            ) {
              throw new SaleProtectionError(
                "PRODUCT_COST_MISSING",
                `${product.name} is not ready for sale. Ask a manager to review the product pricing.`,
              );
            }

            const baseUnitsConsumed =
              item.quantity *
              saleUnit.quantityInBaseUnit;

            /*
             * Server calculates the actual
             * amount using current selling
             * price + current quantity deals.
             */
            const lineTotal =
              calculateBestFitTotal(
                item.quantity,
                saleUnit.sellingPrice,
                saleUnit.priceRules,
              );

            const lineCostTotal =
              roundMoney(
                costPerBaseUnit *
                  baseUnitsConsumed,
              );

            /*
             * This is the private
             * profit/loss protection.
             *
             * Do NOT put actual cost or
             * profit amount in the error
             * shown to the cashier.
             */
            if (
              lineTotal <
              lineCostTotal
            ) {
              throw new SaleProtectionError(
                "SELLING_PRICE_BELOW_COST",
                `${product.name}: this selling price is not allowed. Ask a manager to review the product price.`,
              );
            }

            const lineProfit =
              roundMoney(
                lineTotal -
                  lineCostTotal,
              );

            return {
              productId:
                product.id,

              productName:
                product.name,

              productSaleUnitId:
                saleUnit.id,

              unitName:
                saleUnit.unitName,

              quantity:
                item.quantity,

              quantityInBaseUnit:
                saleUnit.quantityInBaseUnit,

              baseUnitsConsumed,

              /*
               * This remains the normal price
               * of one selected selling unit.
               *
               * lineTotal contains the actual
               * amount after quantity rules.
               */
              unitPrice:
                saleUnit.sellingPrice,

              lineTotal,

              unitCostPrice:
                costPerBaseUnit,

              lineCostTotal,

              lineProfit,
            };
          },
        );

      /*
       * Authoritative subtotal.
       *
       * We do not trust subtotal sent by
       * the cashier's browser.
       */
      const subtotal =
        roundMoney(
          preparedItems.reduce(
            (sum, item) =>
              sum +
              item.lineTotal,
            0,
          ),
        );

      /*
       * Detect stale prices.
       *
       * Example:
       * cashier loaded Pack = ₦900,
       * manager changed it to ₦950,
       * cashier then tries to complete
       * the old ₦900 cart.
       *
       * We stop the sale and ask them
       * to refresh instead of silently
       * changing the customer's total.
       */
      if (
        input.clientSubtotal !=
          null &&
        Number.isFinite(
          input.clientSubtotal,
        ) &&
        Math.abs(
          roundMoney(
            input.clientSubtotal,
          ) -
            subtotal,
        ) > 0.01
      ) {
        throw new SaleProtectionError(
          "PRICE_CHANGED",
          "One or more product prices changed while this sale was open. Refresh the sales page and try again.",
        );
      }

      const amountPaid =
        roundMoney(
          requestedAmountPaid,
        );

      if (
        amountPaid >
        subtotal
      ) {
        throw new SaleProtectionError(
          "INVALID_PAYMENT",
          "Amount paid cannot be greater than the sale total.",
        );
      }

      const balance =
        roundMoney(
          Math.max(
            subtotal -
              amountPaid,
            0,
          ),
        );

      /*
       * Group the true base-unit
       * consumption by product.
       */
      const groupedByProduct =
        new Map<
          string,
          number
        >();

      for (
        const item of
        preparedItems
      ) {
        groupedByProduct.set(
          item.productId,
          (groupedByProduct.get(
            item.productId,
          ) ?? 0) +
            item.baseUnitsConsumed,
        );
      }

      /*
       * Friendly stock check first.
       */
      for (
        const [
          productId,
          totalBaseUnitsConsumed,
        ] of
        groupedByProduct
      ) {
        const product =
          productMap.get(
            productId,
          );

        if (!product) {
          throw new SaleProtectionError(
            "PRODUCT_NOT_AVAILABLE",
            "Product is no longer available.",
          );
        }

        if (
          product.stock <
          totalBaseUnitsConsumed
        ) {
          throw new SaleProtectionError(
            "INSUFFICIENT_STOCK",
            `${product.name}: not enough stock for this sale.`,
          );
        }
      }

      const normalizedCustomerName =
        input.customerName?.trim() ||
        "Walk-in Customer";

      const sale =
        await tx.sale.create({
          data: {
            customerName:
              normalizedCustomerName,

            subtotal:
              toDecimal(
                subtotal,
              ),

            amountPaid:
              toDecimal(
                amountPaid,
              ),

            balance:
              toDecimal(
                balance,
              ),

            items: {
              create:
                preparedItems.map(
                  (item) => ({
                    productId:
                      item.productId,

                    saleUnitId:
                      item.productSaleUnitId,

                    quantity:
                      item.quantity,

                    quantityInBaseUnit:
                      item.baseUnitsConsumed,

                    unitPrice:
                      toDecimal(
                        item.unitPrice,
                      ),

                    lineTotal:
                      toDecimal(
                        item.lineTotal,
                      ),

                    /*
                     * Cost/profit snapshot stays
                     * in the database for owner/
                     * admin reports.
                     */
                    unitCostPrice:
                      toDecimal(
                        item.unitCostPrice,
                      ),

                    lineCostTotal:
                      toDecimal(
                        item.lineCostTotal,
                      ),

                    lineProfit:
                      toDecimal(
                        item.lineProfit,
                      ),
                  }),
                ),
            },
          },

          include: {
            items: {
              include: {
                product: {
                  include: {
                    owner:
                      true,
                  },
                },

                saleUnit: {
                  include: {
                    unit:
                      true,
                  },
                },
              },
            },
          },
        });

      /*
       * Atomic stock reduction.
       *
       * updateMany with stock >= required
       * gives an additional protection
       * against two sales trying to consume
       * the same stock at the same time.
       */
      for (
        const [
          productId,
          totalBaseUnitsConsumed,
        ] of
        groupedByProduct
      ) {
        const product =
          productMap.get(
            productId,
          );

        const updateResult =
          await tx.product.updateMany(
            {
              where: {
                id:
                  productId,

                active:
                  true,

                stock: {
                  gte:
                    totalBaseUnitsConsumed,
                },
              },

              data: {
                stock: {
                  decrement:
                    totalBaseUnitsConsumed,
                },
              },
            },
          );

        if (
          updateResult.count !==
          1
        ) {
          throw new SaleProtectionError(
            "INSUFFICIENT_STOCK",
            `${product?.name ?? "Product"}: stock changed while this sale was being processed. Please try again.`,
          );
        }

        await tx.stockMovement.create(
          {
            data: {
              productId,

              type:
                "OUT",

              quantity:
                totalBaseUnitsConsumed,

              note:
                `Sale ${sale.id}`,
            },
          },
        );
      }

      if (balance > 0) {
        let existingDebt =
          await tx.customerDebt.findFirst(
            {
              where: {
                customerName: {
                  equals:
                    normalizedCustomerName,

                  mode:
                    "insensitive",
                },
              },
            },
          );

        if (
          !existingDebt
        ) {
          existingDebt =
            await tx.customerDebt.create(
              {
                data: {
                  customerName:
                    normalizedCustomerName,

                  balance:
                    toDecimal(
                      0,
                    ),
                },
              },
            );
        }

        await tx.customerDebt.update(
          {
            where: {
              id:
                existingDebt.id,
            },

            data: {
              balance: {
                increment:
                  toDecimal(
                    balance,
                  ),
              },
            },
          },
        );

        await tx.debtTransaction.create(
          {
            data: {
              customerDebtId:
                existingDebt.id,

              saleId:
                sale.id,

              type:
                "SALE_DEBT",

              amount:
                toDecimal(
                  balance,
                ),

              description:
                `Debt from sale ${sale.id}`,

              reference:
                sale.id,
            },
          },
        );
      }

      return sale;
    },

    {
      maxWait:
        15000,

      timeout:
        30000,
    },
  );
}

export async function getTodaySaleItems() {
  const start =
    new Date();

  start.setHours(
    0,
    0,
    0,
    0,
  );

  const end =
    new Date();

  end.setHours(
    23,
    59,
    59,
    999,
  );

  return prisma.saleItem.findMany({
    where: {
      sale: {
        createdAt: {
          gte:
            start,

          lte:
            end,
        },
      },
    },

    include: {
      product:
        true,

      saleUnit: {
        include: {
          unit:
            true,
        },
      },

      sale:
        true,
    },

    orderBy: {
      createdAt:
        "desc",
    },
  });
}

export async function getTodaySalesSummary() {
  const start =
    new Date();

  start.setHours(
    0,
    0,
    0,
    0,
  );

  const end =
    new Date();

  end.setHours(
    23,
    59,
    59,
    999,
  );

  const [
    saleItems,
    sales,
  ] = await Promise.all([
    prisma.saleItem.findMany(
      {
        where: {
          sale: {
            createdAt: {
              gte:
                start,

              lte:
                end,
            },
          },
        },

        select: {
          quantity:
            true,

          lineTotal:
            true,

          lineProfit:
            true,

          sale: {
            select: {
              balance:
                true,
            },
          },
        },
      },
    ),

    prisma.sale.findMany({
      where: {
        createdAt: {
          gte:
            start,

          lte:
            end,
        },
      },

      select: {
        id:
          true,
      },
    }),
  ]);

  const totals =
    saleItems.reduce(
      (acc, item) => {
        acc.revenue +=
          Number(
            item.lineTotal,
          );

        acc.profit +=
          Number(
            item.lineProfit ??
              0,
          );

        acc.itemsSold +=
          item.quantity;

        acc.balance +=
          Number(
            item.sale.balance,
          );

        return acc;
      },

      {
        revenue: 0,
        profit: 0,
        itemsSold: 0,
        balance: 0,
      },
    );

  return {
    salesCount:
      sales.length,

    revenue:
      totals.revenue,

    profit:
      totals.profit,

    itemsSold:
      totals.itemsSold,

    balance:
      totals.balance,
  };
}