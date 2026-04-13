import { prisma } from "@/lib/prisma";

type SalesHistoryFilters = {
  page?: number;
  pageSize?: number;
  q?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
};

function buildWhere(filters: SalesHistoryFilters) {
  const q = filters.q?.trim();
  const from = filters.from?.trim();
  const to = filters.to?.trim();

  const createdAt: { gte?: Date; lte?: Date } = {};

  if (from) {
    createdAt.gte = new Date(`${from}T00:00:00.000Z`);
  }

  if (to) {
    createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }

  return {
    ...(q
      ? {
          OR: [
            {
              customerName: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              items: {
                some: {
                  product: {
                    name: {
                      contains: q,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
    ...(from || to ? { createdAt } : {}),
  };
}

type SalePaymentLike = {
  amountPaid: unknown;
  balance: unknown;
};

function matchesPaymentStatus(sale: SalePaymentLike, status?: string): boolean {
  if (!status) return true;

  const amountPaid = Number(sale.amountPaid ?? 0);
  const balance = Number(sale.balance ?? 0);

  if (status === "paid") return balance <= 0;
  if (status === "partial") return amountPaid > 0 && balance > 0;
  if (status === "owed") return amountPaid === 0 && balance > 0;

  return true;
}

async function fetchSalesHistoryRows(filters: SalesHistoryFilters) {
  return prisma.sale.findMany({
    where: buildWhere(filters),
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: true,
          saleUnit: {
            include: {
              unit: true,
            },
          },
        },
      },
    },
  });
}

type SaleHistoryRow = Awaited<ReturnType<typeof fetchSalesHistoryRows>>[number];
type SaleHistoryItem = SaleHistoryRow["items"][number];

export async function getSalesHistoryPage(filters: SalesHistoryFilters) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 20, 1);

  const allSales = await fetchSalesHistoryRows(filters);

  const filtered = allSales.filter((sale: SaleHistoryRow) =>
    matchesPaymentStatus(sale, filters.paymentStatus),
  );

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    sales: paginated,
    total,
    page,
    pageSize,
  };
}

export async function getSalesHistorySummary(filters: SalesHistoryFilters) {
  const allSales = await fetchSalesHistoryRows(filters);

  const sales = allSales.filter((sale: SaleHistoryRow) =>
    matchesPaymentStatus(sale, filters.paymentStatus),
  );

  const salesCount = sales.length;

  const revenue = sales.reduce((sum: number, sale: SaleHistoryRow) => {
    return sum + Number(sale.subtotal ?? 0);
  }, 0);

  const balance = sales.reduce((sum: number, sale: SaleHistoryRow) => {
    return sum + Number(sale.balance ?? 0);
  }, 0);

  const profit = sales.reduce((sum: number, sale: SaleHistoryRow) => {
    const saleProfit = sale.items.reduce(
      (inner: number, item: SaleHistoryItem) => {
        return inner + Number(item.lineProfit ?? 0);
      },
      0,
    );

    return sum + saleProfit;
  }, 0);

  return {
    salesCount,
    revenue,
    balance,
    profit,
  };
}
