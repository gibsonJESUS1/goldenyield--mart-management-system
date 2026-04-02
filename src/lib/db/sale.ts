import { prisma } from "@/lib/prisma";

export type CreateSaleItemInput = {
  productId: string;
  productSaleUnitId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  baseUnitsConsumed: number;
};

export type CreateSaleInput = {
  customerName?: string;
  subtotal: number;
  amountPaid: number;
  balance: number;
  paymentStatus: "paid" | "partial" | "owed";
  items: CreateSaleItemInput[];
};

type SalesDateFilter = {
  startDate?: Date;
  endDate?: Date;
};

export async function getSales(filters?: SalesDateFilter) {
  return prisma.sale.findMany({
    where:
      filters?.startDate || filters?.endDate
        ? {
            createdAt: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lte: filters.endDate } : {}),
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
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSale(data: CreateSaleInput) {
  return prisma.sale.create({
    data: {
      customerName: data.customerName,
      subtotal: data.subtotal,
      amountPaid: data.amountPaid,
      balance: data.balance,
      paymentStatus: data.paymentStatus,
      items: {
        create: data.items.map((item) => ({
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
}
