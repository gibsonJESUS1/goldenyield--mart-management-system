import { prisma } from "@/lib/prisma";
import {
  type AnalyticsGranularity,
  formatAnalyticsBucketLabel,
  getAnalyticsBucketKey,
} from "@/lib/report-period";

export type BusinessAnalyticsFilters = {
  startDate: Date;
  endDate: Date;
  productId?: string;
  granularity: AnalyticsGranularity;
};

type TimelineBucket = {
  key: string;
  label: string;
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  pendingCostRevenue: number;
};

type ProductBucket = {
  id: string;
  name: string;
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  directExpenses: number;
  netProfit: number;
  pendingCostRevenue: number;
  salesLines: number;
  zeroSaleBatchLoss: number;
};

function safeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getAnalyticsProducts() {
  return prisma.product.findMany({
    select: {
      id: true,
      name: true,
      active: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getBusinessAnalytics(
  filters: BusinessAnalyticsFilters,
) {
  const saleItemWhere = {
    ...(filters.productId ? { productId: filters.productId } : {}),
    sale: {
      createdAt: {
        gte: filters.startDate,
        lt: filters.endDate,
      },
    },
  };

  const expenseWhere = {
    ...(filters.productId ? { productId: filters.productId } : {}),
    spentAt: {
      gte: filters.startDate,
      lt: filters.endDate,
    },
  };

  const batchWhere = {
    ...(filters.productId ? { productId: filters.productId } : {}),
    status: "FINISHED" as const,
    finishedAt: {
      gte: filters.startDate,
      lt: filters.endDate,
    },
  };

  const [saleItems, expenses, finishedBatches] = await Promise.all([
    prisma.saleItem.findMany({
      where: saleItemWhere,
      select: {
        id: true,
        saleId: true,
        productId: true,
        lineTotal: true,
        lineCostTotal: true,
        lineProfit: true,
        sale: {
          select: {
            createdAt: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    prisma.expense.findMany({
      where: expenseWhere,
      select: {
        id: true,
        category: true,
        amount: true,
        spentAt: true,
        productId: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { spentAt: "asc" },
    }),

    prisma.productBatch.findMany({
      where: batchWhere,
      select: {
        id: true,
        productId: true,
        totalCost: true,
        closedRevenue: true,
        closedProfit: true,
        finishedAt: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const timelineMap = new Map<string, TimelineBucket>();
  const productMap = new Map<string, ProductBucket>();
  const expenseCategoryMap = new Map<string, number>();
  const saleIds = new Set<string>();

  let salesRevenue = 0;
  let knownCostRevenue = 0;
  let costOfGoods = 0;
  let grossProfit = 0;
  let expenseTotal = 0;
  let pendingCostRevenue = 0;
  let pendingCostLines = 0;
  let zeroSaleBatchLoss = 0;

  function ensureTimeline(date: Date) {
    const key = getAnalyticsBucketKey(date, filters.granularity);
    const existing = timelineMap.get(key);

    if (existing) return existing;

    const created: TimelineBucket = {
      key,
      label: formatAnalyticsBucketLabel(key, filters.granularity),
      revenue: 0,
      costOfGoods: 0,
      grossProfit: 0,
      expenses: 0,
      netProfit: 0,
      pendingCostRevenue: 0,
    };

    timelineMap.set(key, created);
    return created;
  }

  function ensureProduct(product: { id: string; name: string }) {
    const existing = productMap.get(product.id);
    if (existing) return existing;

    const created: ProductBucket = {
      id: product.id,
      name: product.name,
      revenue: 0,
      costOfGoods: 0,
      grossProfit: 0,
      directExpenses: 0,
      netProfit: 0,
      pendingCostRevenue: 0,
      salesLines: 0,
      zeroSaleBatchLoss: 0,
    };

    productMap.set(product.id, created);
    return created;
  }

  for (const item of saleItems) {
    const revenue = safeNumber(item.lineTotal);
    const hasKnownCost = item.lineCostTotal != null && item.lineProfit != null;
    const cost = hasKnownCost ? safeNumber(item.lineCostTotal) : 0;
    const profit = hasKnownCost ? safeNumber(item.lineProfit) : 0;

    saleIds.add(item.saleId);
    salesRevenue += revenue;

    const timeline = ensureTimeline(item.sale.createdAt);
    timeline.revenue += revenue;

    const product = ensureProduct(item.product);
    product.revenue += revenue;
    product.salesLines += 1;

    if (hasKnownCost) {
      knownCostRevenue += revenue;
      costOfGoods += cost;
      grossProfit += profit;

      timeline.costOfGoods += cost;
      timeline.grossProfit += profit;

      product.costOfGoods += cost;
      product.grossProfit += profit;
    } else {
      pendingCostRevenue += revenue;
      pendingCostLines += 1;
      timeline.pendingCostRevenue += revenue;
      product.pendingCostRevenue += revenue;
    }
  }

  /*
   * Closed batch/container stock with zero sales has no SaleItem rows.
   * Without this adjustment its purchase cost would disappear from reports.
   * Treat it as a product/batch loss on the date the batch was closed.
   */
  for (const batch of finishedBatches) {
    const closedRevenue = safeNumber(batch.closedRevenue);

    if (closedRevenue > 0.009 || !batch.finishedAt) {
      continue;
    }

    const loss = Math.max(safeNumber(batch.totalCost), 0);
    if (loss <= 0) continue;

    zeroSaleBatchLoss += loss;
    costOfGoods += loss;
    grossProfit -= loss;

    const timeline = ensureTimeline(batch.finishedAt);
    timeline.costOfGoods += loss;
    timeline.grossProfit -= loss;

    const product = ensureProduct(batch.product);
    product.costOfGoods += loss;
    product.grossProfit -= loss;
    product.zeroSaleBatchLoss += loss;
  }

  for (const expense of expenses) {
    const amount = safeNumber(expense.amount);
    expenseTotal += amount;

    const timeline = ensureTimeline(expense.spentAt);
    timeline.expenses += amount;

    expenseCategoryMap.set(
      expense.category,
      (expenseCategoryMap.get(expense.category) ?? 0) + amount,
    );

    if (expense.product) {
      const product = ensureProduct(expense.product);
      product.directExpenses += amount;
    }
  }

  const timeline = Array.from(timelineMap.values())
    .map((row) => ({
      ...row,
      revenue: roundMoney(row.revenue),
      costOfGoods: roundMoney(row.costOfGoods),
      grossProfit: roundMoney(row.grossProfit),
      expenses: roundMoney(row.expenses),
      netProfit: roundMoney(row.grossProfit - row.expenses),
      pendingCostRevenue: roundMoney(row.pendingCostRevenue),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const productPerformance = Array.from(productMap.values())
    .map((row) => ({
      ...row,
      revenue: roundMoney(row.revenue),
      costOfGoods: roundMoney(row.costOfGoods),
      grossProfit: roundMoney(row.grossProfit),
      directExpenses: roundMoney(row.directExpenses),
      netProfit: roundMoney(row.grossProfit - row.directExpenses),
      pendingCostRevenue: roundMoney(row.pendingCostRevenue),
      zeroSaleBatchLoss: roundMoney(row.zeroSaleBatchLoss),
      margin:
        row.revenue - row.pendingCostRevenue > 0
          ? roundPercent(
              (row.grossProfit / (row.revenue - row.pendingCostRevenue)) * 100,
            )
          : 0,
    }))
    .sort((a, b) => b.netProfit - a.netProfit);

  const expenseCategories = Array.from(expenseCategoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount: roundMoney(amount),
    }))
    .sort((a, b) => b.amount - a.amount);

  salesRevenue = roundMoney(salesRevenue);
  knownCostRevenue = roundMoney(knownCostRevenue);
  costOfGoods = roundMoney(costOfGoods);
  grossProfit = roundMoney(grossProfit);
  expenseTotal = roundMoney(expenseTotal);
  pendingCostRevenue = roundMoney(pendingCostRevenue);
  zeroSaleBatchLoss = roundMoney(zeroSaleBatchLoss);

  const netProfit = roundMoney(grossProfit - expenseTotal);
  const costCoverage =
    salesRevenue > 0
      ? roundPercent((knownCostRevenue / salesRevenue) * 100)
      : 100;
  const grossMargin =
    knownCostRevenue > 0
      ? roundPercent((grossProfit / knownCostRevenue) * 100)
      : 0;

  return {
    summary: {
      salesRevenue,
      costOfGoods,
      grossProfit,
      expenses: expenseTotal,
      netProfit,
      salesCount: saleIds.size,
      salesLines: saleItems.length,
      pendingCostRevenue,
      pendingCostLines,
      zeroSaleBatchLoss,
      costCoverage,
      grossMargin,
    },
    timeline,
    productPerformance,
    expenseCategories,
  };
}
