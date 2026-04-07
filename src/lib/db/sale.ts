import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type GetSalesFilters = {
  startDate?: Date;
  endDate?: Date;
};

type CreateSaleWithInventoryInput = {
  customerName?: string;
  subtotal: number;
  amountPaid: number;
  balance: number;
  items: Array<{
    productId: string;
    productSaleUnitId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    baseUnitsConsumed: number;
  }>;
};

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

type ProductRow = {
  id: string;
  name: string;
  stock: number;
  currentCostPrice: Prisma.Decimal | null;
};

type SaleUnitRow = {
  id: string;
  productId: string;
  quantityInBaseUnit: number;
  unitId: string;
};

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
  const groupedByProduct = new Map<string, number>();

  for (const item of input.items) {
    groupedByProduct.set(
      item.productId,
      (groupedByProduct.get(item.productId) ?? 0) + item.baseUnitsConsumed,
    );
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const saleUnitIds = [
    ...new Set(input.items.map((item) => item.productSaleUnitId)),
  ];

  const [products, saleUnits]: [ProductRow[], SaleUnitRow[]] =
    await Promise.all([
      prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
        select: {
          id: true,
          name: true,
          stock: true,
          currentCostPrice: true,
        },
      }),
      prisma.productSaleUnit.findMany({
        where: {
          id: {
            in: saleUnitIds,
          },
        },
        select: {
          id: true,
          productId: true,
          quantityInBaseUnit: true,
          unitId: true,
        },
      }),
    ]);

  const productMap = new Map(
    products.map((product: ProductRow) => [
      product.id,
      {
        id: product.id,
        name: product.name,
        stock: product.stock,
        currentCostPrice: Number(product.currentCostPrice ?? 0),
      },
    ]),
  );

  const saleUnitMap = new Map(
    saleUnits.map((saleUnit: SaleUnitRow) => [
      saleUnit.id,
      {
        id: saleUnit.id,
        productId: saleUnit.productId,
        quantityInBaseUnit: saleUnit.quantityInBaseUnit,
        unitId: saleUnit.unitId,
      },
    ]),
  );

  for (const item of input.items) {
    const saleUnit = saleUnitMap.get(item.productSaleUnitId);
    if (!saleUnit) {
      throw new Error("Invalid sale unit");
    }

    if (saleUnit.productId !== item.productId) {
      throw new Error("Invalid sale unit for selected product");
    }

    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const expectedBaseUnits = saleUnit.quantityInBaseUnit * item.quantity;
    if (expectedBaseUnits !== item.baseUnitsConsumed) {
      throw new Error(
        `Base unit mismatch for ${product.name}. Expected ${expectedBaseUnits}, got ${item.baseUnitsConsumed}`,
      );
    }
  }

  for (const [productId, totalBaseUnitsConsumed] of groupedByProduct) {
    const product = productMap.get(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    if (product.stock < totalBaseUnitsConsumed) {
      throw new Error(
        `Not enough stock for ${product.name}. Available base stock is ${product.stock}.`,
      );
    }
  }

  const normalizedCustomerName =
    input.customerName?.trim() || "Walk-in Customer";

  return prisma.$transaction(
    async (tx) => {
      const sale = await tx.sale.create({
        data: {
          customerName: normalizedCustomerName,
          subtotal: toDecimal(input.subtotal),
          amountPaid: toDecimal(input.amountPaid),
          balance: toDecimal(input.balance),
          items: {
            create: input.items.map((item) => {
              const product = productMap.get(item.productId);

              if (!product) {
                throw new Error("Product cost data not found");
              }

              const unitCostPrice = product.currentCostPrice;
              const lineCostTotal = unitCostPrice * item.baseUnitsConsumed;
              const lineProfit = item.total - lineCostTotal;

              return {
                productId: item.productId,
                saleUnitId: item.productSaleUnitId,
                quantity: item.quantity,
                quantityInBaseUnit: item.baseUnitsConsumed,
                unitPrice: toDecimal(item.unitPrice),
                lineTotal: toDecimal(item.total),
                unitCostPrice: toDecimal(unitCostPrice),
                lineCostTotal: toDecimal(lineCostTotal),
                lineProfit: toDecimal(lineProfit),
              };
            }),
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

      await Promise.all(
        [...groupedByProduct.entries()].flatMap(
          ([productId, totalBaseUnitsConsumed]) => [
            tx.stockMovement.create({
              data: {
                productId,
                type: "OUT",
                quantity: totalBaseUnitsConsumed,
                note: `Sale ${sale.id}`,
              },
            }),
            tx.product.update({
              where: { id: productId },
              data: {
                stock: {
                  decrement: totalBaseUnitsConsumed,
                },
              },
            }),
          ],
        ),
      );

      if (input.balance > 0) {
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
          where: { id: existingDebt.id },
          data: {
            balance: {
              increment: toDecimal(input.balance),
            },
          },
        });

        await tx.debtTransaction.create({
          data: {
            customerDebtId: existingDebt.id,
            saleId: sale.id,
            type: "SALE_DEBT",
            amount: toDecimal(input.balance),
            description: `Debt from sale ${sale.id}`,
            reference: sale.id,
          },
        });
      }

      return sale;
    },
    {
      maxWait: 15000,
      timeout: 20000,
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
