import { prisma } from "@/lib/prisma";

type PaymentStatus = "paid" | "partial" | "owed";

type GetSalesFilters = {
  startDate?: Date;
  endDate?: Date;
};

type CreateSaleWithInventoryInput = {
  customerName?: string;
  subtotal: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  items: Array<{
    productId: string;
    productSaleUnitId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    baseUnitsConsumed: number;
  }>;
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
          product: true,
          productSaleUnit: {
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
  return prisma.$transaction(async (tx) => {
    const groupedByProduct = new Map<string, number>();

    for (const item of input.items) {
      const current = groupedByProduct.get(item.productId) ?? 0;
      groupedByProduct.set(item.productId, current + item.baseUnitsConsumed);
    }

    for (const item of input.items) {
      const saleUnit = await tx.productSaleUnit.findUnique({
        where: { id: item.productSaleUnitId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              stock: true,
              unitId: true,
            },
          },
          unit: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!saleUnit) {
        throw new Error("Invalid sale unit");
      }

      if (saleUnit.productId !== item.productId) {
        throw new Error("Invalid sale unit for selected product");
      }

      const expectedBaseUnits = saleUnit.quantityInBaseUnit * item.quantity;

      if (expectedBaseUnits !== item.baseUnitsConsumed) {
        throw new Error(
          `Base unit mismatch for ${saleUnit.product.name}. Expected ${expectedBaseUnits}, got ${item.baseUnitsConsumed}`,
        );
      }
    }

    for (const [productId, totalBaseUnitsConsumed] of groupedByProduct) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          stock: true,
          unit: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      if (product.stock < totalBaseUnitsConsumed) {
        throw new Error(
          `Not enough stock for ${product.name}. Available base stock is ${product.stock} ${product.unit.name}.`,
        );
      }
    }

    const sale = await tx.sale.create({
      data: {
        customerName: input.customerName || "Walk-in Customer",
        subtotal: input.subtotal,
        amountPaid: input.amountPaid,
        balance: input.balance,
        paymentStatus: input.paymentStatus,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            productSaleUnitId: item.productSaleUnitId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            baseUnitsConsumed: item.baseUnitsConsumed,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
            productSaleUnit: {
              include: {
                unit: true,
              },
            },
          },
        },
      },
    });

    for (const [productId, totalBaseUnitsConsumed] of groupedByProduct) {
      await tx.stockMovement.create({
        data: {
          productId,
          type: "sale",
          quantity: -totalBaseUnitsConsumed,
          note: `Sale ${sale.id}`,
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          stock: {
            decrement: totalBaseUnitsConsumed,
          },
        },
      });
    }

    if (
      (input.paymentStatus === "partial" || input.paymentStatus === "owed") &&
      input.balance > 0
    ) {
      const customerName = input.customerName?.trim() || "Walk-in Customer";

      const existingDebt = await tx.customerDebt.findUnique({
        where: {
          customerName,
        },
      });

      if (existingDebt) {
        await tx.customerDebt.update({
          where: {
            id: existingDebt.id,
          },
          data: {
            totalDebt: {
              increment: input.balance,
            },
            transactions: {
              create: {
                type: "sale",
                amount: input.balance,
                note: `Debt added from sale ${sale.id}`,
              },
            },
          },
        });
      } else {
        await tx.customerDebt.create({
          data: {
            customerName,
            totalDebt: input.balance,
            transactions: {
              create: {
                type: "sale",
                amount: input.balance,
                note: `Debt added from sale ${sale.id}`,
              },
            },
          },
        });
      }
    }

    return sale;
  });
}
