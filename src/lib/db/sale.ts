import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type GetSalesFilters = {
  startDate?: Date;
  endDate?: Date;
};

export type SaleInputMode =
  | "STANDARD"
  | "WEIGHT_KG"
  | "VARIABLE_PIECE";

type CreateSaleWithInventoryInput = {
  customerName?: string;
  clientSubtotal?: number;
  amountPaid: number;

  items: Array<{
    productId: string;
    mode?: SaleInputMode;
    productSaleUnitId?: string;
    quantity?: number;
    weightGrams?: number;
    manualUnitPrice?: number;
  }>;
};

export type SaleProtectionCode =
  | "PRODUCT_NOT_AVAILABLE"
  | "SELLING_UNIT_NOT_AVAILABLE"
  | "PRODUCT_COST_MISSING"
  | "SELLING_PRICE_BELOW_COST"
  | "INSUFFICIENT_STOCK"
  | "PRICE_CHANGED"
  | "INVALID_PAYMENT"
  | "INVALID_FLEXIBLE_SALE";

export class SaleProtectionError extends Error {
  code: SaleProtectionCode;

  constructor(code: SaleProtectionCode, message: string) {
    super(message);
    this.name = "SaleProtectionError";
    this.code = code;
  }
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(
    roundMoney(Number.isFinite(value) ? value : 0).toFixed(2),
  );
}

type PriceRuleRow = {
  quantity: number;
  price: number;
  active: boolean;
};

function calculateBestFitTotal(
  quantity: number,
  normalSellingPrice: number,
  priceRules: PriceRuleRow[],
) {
  const activeRules = [...priceRules]
    .filter(
      (rule) =>
        rule.active &&
        Number.isInteger(rule.quantity) &&
        rule.quantity > 0 &&
        Number.isFinite(rule.price) &&
        rule.price >= 0,
    )
    .sort((a, b) => b.quantity - a.quantity);

  if (activeRules.length === 0) {
    return roundMoney(quantity * normalSellingPrice);
  }

  let remaining = quantity;
  let total = 0;

  for (const rule of activeRules) {
    const count = Math.floor(remaining / rule.quantity);

    if (count > 0) {
      total += count * rule.price;
      remaining -= count * rule.quantity;
    }
  }

  if (remaining > 0) {
    total += remaining * normalSellingPrice;
  }

  return roundMoney(total);
}

function positiveNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : null;
}

export async function getSales(filters: GetSalesFilters = {}) {
  return prisma.sale.findMany({
    where:
      filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lt: filters.endDate } : {}),
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
      createdAt: "desc",
    },
  });
}

export async function createSaleWithInventory(
  input: CreateSaleWithInventoryInput,
) {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("At least one sale item is required");
  }

  const normalizedItems = input.items.map((item) => {
    const mode: SaleInputMode = item.mode ?? "STANDARD";

    if (!item.productId || typeof item.productId !== "string") {
      throw new Error("Invalid sale item");
    }

    if (mode === "STANDARD") {
      if (!item.productSaleUnitId) {
        throw new Error("Selling unit is required.");
      }

      if (
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        throw new Error("Invalid quantity");
      }

      return {
        productId: item.productId,
        mode,
        productSaleUnitId: item.productSaleUnitId,
        quantity: Number(item.quantity),
        weightGrams: undefined,
        manualUnitPrice: undefined,
      };
    }

    if (mode === "WEIGHT_KG") {
      if (
        !Number.isInteger(Number(item.weightGrams)) ||
        Number(item.weightGrams) <= 0
      ) {
        throw new SaleProtectionError(
          "INVALID_FLEXIBLE_SALE",
          "Enter a valid weight greater than 0.",
        );
      }

      return {
        productId: item.productId,
        mode,
        productSaleUnitId: undefined,
        quantity: 1,
        weightGrams: Number(item.weightGrams),
        manualUnitPrice: undefined,
      };
    }

    if (mode === "VARIABLE_PIECE") {
      if (
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        throw new SaleProtectionError(
          "INVALID_FLEXIBLE_SALE",
          "Enter a valid whole-number piece quantity.",
        );
      }

      const manualUnitPrice = Number(item.manualUnitPrice);

      if (!Number.isFinite(manualUnitPrice) || manualUnitPrice <= 0) {
        throw new SaleProtectionError(
          "INVALID_FLEXIBLE_SALE",
          "Enter a valid price for the piece.",
        );
      }

      return {
        productId: item.productId,
        mode,
        productSaleUnitId: undefined,
        quantity: Number(item.quantity),
        weightGrams: undefined,
        manualUnitPrice,
      };
    }

    throw new SaleProtectionError(
      "INVALID_FLEXIBLE_SALE",
      "Unknown sale mode.",
    );
  });

  const requestedAmountPaid = Number(input.amountPaid);

  if (!Number.isFinite(requestedAmountPaid) || requestedAmountPaid < 0) {
    throw new SaleProtectionError(
      "INVALID_PAYMENT",
      "Invalid amount paid.",
    );
  }

  const productIds = [
    ...new Set(normalizedItems.map((item) => item.productId)),
  ];

  const saleUnitIds = [
    ...new Set(
      normalizedItems
        .filter(
          (item) =>
            item.mode === "STANDARD" &&
            item.productSaleUnitId,
        )
        .map((item) => item.productSaleUnitId!),
    ),
  ];

  return prisma.$transaction(
    async (tx) => {
      const [products, saleUnits] = await Promise.all([
        tx.product.findMany({
          where: {
            id: {
              in: productIds,
            },
          },

          select: {
            id: true,
            name: true,
            stock: true,
            active: true,
            currentCostPrice: true,

            weightTrackingEnabled: true,
            weightStockGrams: true,
            costPerKg: true,
            pricePerKg: true,

            allowVariablePiecePrice: true,
            minPiecePrice: true,
            maxPiecePrice: true,
          },
        }),

        saleUnitIds.length > 0
          ? tx.productSaleUnit.findMany({
              where: {
                id: {
                  in: saleUnitIds,
                },
              },

              select: {
                id: true,
                productId: true,
                quantityInBaseUnit: true,
                sellingPrice: true,
                active: true,

                unit: {
                  select: {
                    name: true,
                  },
                },

                priceRules: {
                  where: {
                    active: true,
                  },

                  select: {
                    quantity: true,
                    price: true,
                    active: true,
                  },

                  orderBy: {
                    quantity: "desc",
                  },
                },
              },
            })
          : Promise.resolve([]),
      ]);

      const productMap = new Map(
        products.map((product) => [
          product.id,
          {
            id: product.id,
            name: product.name,
            stock: product.stock,
            active: product.active,

            currentCostPrice:
              product.currentCostPrice != null
                ? Number(product.currentCostPrice)
                : null,

            weightTrackingEnabled:
              product.weightTrackingEnabled,

            weightStockGrams:
              product.weightStockGrams,

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
          },
        ]),
      );

      const saleUnitMap = new Map(
        saleUnits.map((saleUnit) => [
          saleUnit.id,
          {
            id: saleUnit.id,
            productId: saleUnit.productId,
            unitName: saleUnit.unit.name,
            quantityInBaseUnit: saleUnit.quantityInBaseUnit,
            sellingPrice: Number(saleUnit.sellingPrice),
            active: saleUnit.active,
            priceRules: saleUnit.priceRules.map((rule) => ({
              quantity: rule.quantity,
              price: Number(rule.price),
              active: rule.active,
            })),
          },
        ]),
      );

      const preparedItems = normalizedItems.map((item) => {
        const product = productMap.get(item.productId);

        if (!product || !product.active) {
          throw new SaleProtectionError(
            "PRODUCT_NOT_AVAILABLE",
            "This product is not currently available for sale.",
          );
        }

        if (item.mode === "WEIGHT_KG") {
          if (!product.weightTrackingEnabled) {
            throw new SaleProtectionError(
              "INVALID_FLEXIBLE_SALE",
              `${product.name}: selling by weight is not enabled.`,
            );
          }

          const pricePerKg = positiveNumber(product.pricePerKg);
          const costPerKg = positiveNumber(product.costPerKg);

          if (pricePerKg == null) {
            throw new SaleProtectionError(
              "SELLING_UNIT_NOT_AVAILABLE",
              `${product.name}: kilogram selling price is not configured.`,
            );
          }

          if (costPerKg == null) {
            throw new SaleProtectionError(
              "PRODUCT_COST_MISSING",
              `${product.name} is not ready for a weight sale. Ask a manager to review the kilogram cost.`,
            );
          }

          const weightGrams = item.weightGrams!;

          const lineTotal = roundMoney(
            pricePerKg * (weightGrams / 1000),
          );

          const lineCostTotal = roundMoney(
            costPerKg * (weightGrams / 1000),
          );

          if (lineTotal < lineCostTotal) {
            throw new SaleProtectionError(
              "SELLING_PRICE_BELOW_COST",
              `${product.name}: this selling price is not allowed. Ask a manager to review the kilogram price.`,
            );
          }

          return {
            productId: product.id,
            productName: product.name,
            productSaleUnitId: null as string | null,
            unitName: "Kg",
            saleMode: "WEIGHT_KG" as const,
            quantity: 1,
            baseUnitsConsumed: 0,
            countConsumed: 0,
            weightGrams,
            weightConsumed: weightGrams,
            unitPrice: pricePerKg,
            manualUnitPrice: null as number | null,
            lineTotal,
            unitCostPrice: costPerKg,
            lineCostTotal,
            lineProfit: roundMoney(lineTotal - lineCostTotal),
          };
        }

        if (item.mode === "VARIABLE_PIECE") {
          if (!product.allowVariablePiecePrice) {
            throw new SaleProtectionError(
              "INVALID_FLEXIBLE_SALE",
              `${product.name}: variable piece selling is not enabled.`,
            );
          }

          const costPerPiece = positiveNumber(product.currentCostPrice);

          if (costPerPiece == null) {
            throw new SaleProtectionError(
              "PRODUCT_COST_MISSING",
              `${product.name} is not ready for a piece sale. Ask a manager to review the product cost.`,
            );
          }

          const quantity = item.quantity;
          const manualUnitPrice = item.manualUnitPrice!;

          const lineTotal = roundMoney(
            manualUnitPrice * quantity,
          );

          const lineCostTotal = roundMoney(
            costPerPiece * quantity,
          );

          if (lineTotal < lineCostTotal) {
            throw new SaleProtectionError(
              "SELLING_PRICE_BELOW_COST",
              `${product.name}: this piece price is not allowed. Ask a manager to review the product price.`,
            );
          }

          return {
            productId: product.id,
            productName: product.name,
            productSaleUnitId: null as string | null,
            unitName: "Piece",
            saleMode: "VARIABLE_PIECE" as const,
            quantity,
            baseUnitsConsumed: quantity,
            countConsumed: quantity,
            weightGrams: null as number | null,
            weightConsumed: 0,
            unitPrice: manualUnitPrice,
            manualUnitPrice,
            lineTotal,
            unitCostPrice: costPerPiece,
            lineCostTotal,
            lineProfit: roundMoney(lineTotal - lineCostTotal),
          };
        }

        const saleUnit =
          saleUnitMap.get(item.productSaleUnitId!);

        if (
          !saleUnit ||
          !saleUnit.active ||
          saleUnit.productId !== product.id
        ) {
          throw new SaleProtectionError(
            "SELLING_UNIT_NOT_AVAILABLE",
            `${product.name}: this selling option is no longer available. Refresh the page and try again.`,
          );
        }

        const costPerBaseUnit =
          positiveNumber(product.currentCostPrice);

        if (costPerBaseUnit == null) {
          throw new SaleProtectionError(
            "PRODUCT_COST_MISSING",
            `${product.name} is not ready for sale. Ask a manager to review the product pricing.`,
          );
        }

        const baseUnitsConsumed =
          item.quantity * saleUnit.quantityInBaseUnit;

        const lineTotal = calculateBestFitTotal(
          item.quantity,
          saleUnit.sellingPrice,
          saleUnit.priceRules,
        );

        const lineCostTotal = roundMoney(
          costPerBaseUnit * baseUnitsConsumed,
        );

        if (lineTotal < lineCostTotal) {
          throw new SaleProtectionError(
            "SELLING_PRICE_BELOW_COST",
            `${product.name}: this selling price is not allowed. Ask a manager to review the product price.`,
          );
        }

        return {
          productId: product.id,
          productName: product.name,
          productSaleUnitId: saleUnit.id,
          unitName: saleUnit.unitName,
          saleMode: "STANDARD" as const,
          quantity: item.quantity,
          baseUnitsConsumed,
          countConsumed: baseUnitsConsumed,
          weightGrams: null as number | null,
          weightConsumed: 0,
          unitPrice: saleUnit.sellingPrice,
          manualUnitPrice: null as number | null,
          lineTotal,
          unitCostPrice: costPerBaseUnit,
          lineCostTotal,
          lineProfit: roundMoney(lineTotal - lineCostTotal),
        };
      });

      const subtotal = roundMoney(
        preparedItems.reduce(
          (sum, item) => sum + item.lineTotal,
          0,
        ),
      );

      if (
        input.clientSubtotal != null &&
        Number.isFinite(input.clientSubtotal) &&
        Math.abs(roundMoney(input.clientSubtotal) - subtotal) > 0.01
      ) {
        throw new SaleProtectionError(
          "PRICE_CHANGED",
          "One or more product prices changed while this sale was open. Refresh the sales page and try again.",
        );
      }

      const amountPaid = roundMoney(requestedAmountPaid);

      if (amountPaid > subtotal) {
        throw new SaleProtectionError(
          "INVALID_PAYMENT",
          "Amount paid cannot be greater than the sale total.",
        );
      }

      const balance = roundMoney(
        Math.max(subtotal - amountPaid, 0),
      );

      const countByProduct = new Map<string, number>();
      const weightByProduct = new Map<string, number>();

      for (const item of preparedItems) {
        if (item.countConsumed > 0) {
          countByProduct.set(
            item.productId,
            (countByProduct.get(item.productId) ?? 0) +
              item.countConsumed,
          );
        }

        if (item.weightConsumed > 0) {
          weightByProduct.set(
            item.productId,
            (weightByProduct.get(item.productId) ?? 0) +
              item.weightConsumed,
          );
        }
      }

      for (const [productId, countConsumed] of countByProduct) {
        const product = productMap.get(productId);

        if (!product || product.stock < countConsumed) {
          throw new SaleProtectionError(
            "INSUFFICIENT_STOCK",
            `${product?.name ?? "Product"}: not enough count stock for this sale.`,
          );
        }
      }

      for (const [productId, weightConsumed] of weightByProduct) {
        const product = productMap.get(productId);

        if (!product || product.weightStockGrams < weightConsumed) {
          throw new SaleProtectionError(
            "INSUFFICIENT_STOCK",
            `${product?.name ?? "Product"}: not enough weight stock for this sale.`,
          );
        }
      }

      const normalizedCustomerName =
        input.customerName?.trim() || "Walk-in Customer";

      const sale = await tx.sale.create({
        data: {
          customerName: normalizedCustomerName,
          subtotal: toDecimal(subtotal),
          amountPaid: toDecimal(amountPaid),
          balance: toDecimal(balance),

          items: {
            create: preparedItems.map((item) => ({
              productId: item.productId,
              saleUnitId: item.productSaleUnitId,
              quantity: item.quantity,
              quantityInBaseUnit: item.baseUnitsConsumed,
              unitPrice: toDecimal(item.unitPrice),
              lineTotal: toDecimal(item.lineTotal),
              unitCostPrice: toDecimal(item.unitCostPrice),
              lineCostTotal: toDecimal(item.lineCostTotal),
              lineProfit: toDecimal(item.lineProfit),
              saleMode: item.saleMode,
              weightGrams: item.weightGrams,
              manualUnitPrice:
                item.manualUnitPrice != null
                  ? toDecimal(item.manualUnitPrice)
                  : null,
            })),
          },
        },

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
      });

      for (const [productId, countConsumed] of countByProduct) {
        const product = productMap.get(productId);

        const updateResult = await tx.product.updateMany({
          where: {
            id: productId,
            active: true,
            stock: {
              gte: countConsumed,
            },
          },
          data: {
            stock: {
              decrement: countConsumed,
            },
          },
        });

        if (updateResult.count !== 1) {
          throw new SaleProtectionError(
            "INSUFFICIENT_STOCK",
            `${product?.name ?? "Product"}: count stock changed while this sale was being processed. Please try again.`,
          );
        }

        await tx.stockMovement.create({
          data: {
            productId,
            type: "OUT",
            quantity: countConsumed,
            bucket: "COUNT",
            note: `Sale ${sale.id}`,
          },
        });
      }

      for (const [productId, weightConsumed] of weightByProduct) {
        const product = productMap.get(productId);

        const updateResult = await tx.product.updateMany({
          where: {
            id: productId,
            active: true,
            weightTrackingEnabled: true,
            weightStockGrams: {
              gte: weightConsumed,
            },
          },
          data: {
            weightStockGrams: {
              decrement: weightConsumed,
            },
          },
        });

        if (updateResult.count !== 1) {
          throw new SaleProtectionError(
            "INSUFFICIENT_STOCK",
            `${product?.name ?? "Product"}: weight stock changed while this sale was being processed. Please try again.`,
          );
        }

        await tx.stockMovement.create({
          data: {
            productId,
            type: "OUT",
            quantity: weightConsumed,
            bucket: "WEIGHT_GRAMS",
            note:
              `Sale ${sale.id} — ` +
              `${(weightConsumed / 1000).toFixed(3)}kg`,
          },
        });
      }

      if (balance > 0) {
        let existingDebt = await tx.customerDebt.findFirst({
          where: {
            customerName: {
              equals: normalizedCustomerName,
              mode: "insensitive",
            },
          },
        });

        if (!existingDebt) {
          existingDebt = await tx.customerDebt.create({
            data: {
              customerName: normalizedCustomerName,
              balance: toDecimal(0),
            },
          });
        }

        await tx.customerDebt.update({
          where: {
            id: existingDebt.id,
          },
          data: {
            balance: {
              increment: toDecimal(balance),
            },
          },
        });

        await tx.debtTransaction.create({
          data: {
            customerDebtId: existingDebt.id,
            saleId: sale.id,
            type: "SALE_DEBT",
            amount: toDecimal(balance),
            description: `Debt from sale ${sale.id}`,
            reference: sale.id,
          },
        });
      }

      return sale;
    },

    {
      maxWait: 15000,
      timeout: 30000,
    },
  );
}

export async function getTodaySaleItems() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return prisma.saleItem.findMany({
    where: {
      sale: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    },

    include: {
      product: true,
      saleUnit: {
        include: {
          unit: true,
        },
      },
      sale: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getTodaySalesSummary() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [saleItems, sales] = await Promise.all([
    prisma.saleItem.findMany({
      where: {
        sale: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      },

      select: {
        quantity: true,
        lineTotal: true,
        lineProfit: true,
        sale: {
          select: {
            balance: true,
          },
        },
      },
    }),

    prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  const totals = saleItems.reduce(
    (acc, item) => {
      acc.revenue += Number(item.lineTotal);
      acc.profit += Number(item.lineProfit ?? 0);
      acc.itemsSold += item.quantity;
      acc.balance += Number(item.sale.balance);
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
    salesCount: sales.length,
    revenue: totals.revenue,
    profit: totals.profit,
    itemsSold: totals.itemsSold,
    balance: totals.balance,
  };
}
