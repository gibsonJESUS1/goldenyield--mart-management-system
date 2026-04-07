import { prisma } from "@/lib/prisma";

type DashboardFilter = {
  startDate?: Date;
  endDate?: Date;
};

export async function getDashboardData(filters?: DashboardFilter) {
  const [owners, products, sales, debts] = await Promise.all([
    prisma.owner.findMany({
      orderBy: { createdAt: "desc" },
    }),

    prisma.product.findMany({
      include: {
        owner: true,
        category: true,
        unit: true,
        saleUnits: {
          include: {
            unit: true,
            priceRules: {
              where: { active: true },
              orderBy: { quantity: "desc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.sale.findMany({
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
      orderBy: { createdAt: "desc" },
    }),

    prisma.customerDebt.findMany({
      include: {
        transactions: {
          where:
            filters?.startDate || filters?.endDate
              ? {
                  createdAt: {
                    ...(filters.startDate ? { gte: filters.startDate } : {}),
                    ...(filters.endDate ? { lte: filters.endDate } : {}),
                  },
                }
              : undefined,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { balance: "desc" },
    }),
  ]);

  return { owners, products, sales, debts };
}
