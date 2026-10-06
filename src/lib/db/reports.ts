import { prisma } from "@/lib/prisma";

export type ProfitabilityReportFilters = {
  startDate?: Date;
  endDate?: Date;
};

type PerformanceBucket = {
  id: string;
  name: string;
  revenue: number;
  knownRevenue: number;
  cost: number;
  profit: number;
  missingCostLines: number;
};

type ProductPerformanceBucket = PerformanceBucket & {
  baseUnitsSold: number;
  baseUnitName: string;
};

function toSafeNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function marginPercent(profit: number, knownRevenue: number) {
  if (knownRevenue <= 0) return 0;
  return (profit / knownRevenue) * 100;
}

function hasValidCostSnapshot(item: {
  unitCostPrice: unknown;
  lineCostTotal: unknown;
  lineProfit: unknown;
}) {
  return (
    item.unitCostPrice != null &&
    toSafeNumber(item.unitCostPrice) > 0 &&
    item.lineCostTotal != null &&
    item.lineProfit != null
  );
}

export async function getProfitabilityReport(
  filters: ProfitabilityReportFilters = {},
) {
  const [products, sales] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        stock: true,
        lowStock: true,
        currentCostPrice: true,
        ownerId: true,
        owner: { select: { id: true, name: true } },
        categoryId: true,
        category: { select: { id: true, name: true } },
        unit: { select: { name: true } },
        saleUnits: {
          where: { active: true },
          select: {
            id: true,
            quantityInBaseUnit: true,
            sellingPrice: true,
            isDefault: true,
            unit: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),

    prisma.sale.findMany({
      where:
        filters.startDate || filters.endDate
          ? {
              createdAt: {
                ...(filters.startDate ? { gte: filters.startDate } : {}),
                ...(filters.endDate ? { lt: filters.endDate } : {}),
              },
            }
          : undefined,
      select: {
        id: true,
        customerName: true,
        subtotal: true,
        amountPaid: true,
        balance: true,
        createdAt: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            quantityInBaseUnit: true,
            unitPrice: true,
            lineTotal: true,
            unitCostPrice: true,
            lineCostTotal: true,
            lineProfit: true,
            product: {
              select: {
                id: true,
                name: true,
                ownerId: true,
                owner: { select: { id: true, name: true } },
                categoryId: true,
                category: { select: { id: true, name: true } },
                unit: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const inventoryRows = products.map((product) => {
    const rawCostPrice =
      product.currentCostPrice != null ? Number(product.currentCostPrice) : null;

    const costPrice =
      rawCostPrice != null && Number.isFinite(rawCostPrice) && rawCostPrice > 0
        ? rawCostPrice
        : null;

    // Product.stock is stored in base units, so retail valuation must use
    // the active selling unit whose conversion is exactly 1 base unit.
    const baseSaleUnit = product.saleUnits.find(
      (saleUnit) => saleUnit.quantityInBaseUnit === 1,
    );

    const rawBaseSellingPrice = baseSaleUnit
      ? Number(baseSaleUnit.sellingPrice)
      : null;

    const baseSellingPrice =
      rawBaseSellingPrice != null &&
      Number.isFinite(rawBaseSellingPrice) &&
      rawBaseSellingPrice > 0
        ? rawBaseSellingPrice
        : null;

    const stockCostValue =
      costPrice != null ? roundMoney(product.stock * costPrice) : null;

    const stockRetailValue =
      baseSellingPrice != null
        ? roundMoney(product.stock * baseSellingPrice)
        : null;

    const potentialGrossProfit =
      stockCostValue != null && stockRetailValue != null
        ? roundMoney(stockRetailValue - stockCostValue)
        : null;

    const potentialMargin =
      stockRetailValue != null &&
      stockRetailValue > 0 &&
      potentialGrossProfit != null
        ? (potentialGrossProfit / stockRetailValue) * 100
        : null;

    return {
      id: product.id,
      name: product.name,
      category: product.category.name,
      ownerName: product.owner.name,
      baseUnitName: product.unit.name,
      stock: product.stock,
      lowStock: product.lowStock,
      costPrice,
      baseSellingPrice,
      stockCostValue,
      stockRetailValue,
      potentialGrossProfit,
      potentialMargin,
    };
  });

  const inventoryCostValue = roundMoney(
    inventoryRows.reduce((sum, row) => sum + (row.stockCostValue ?? 0), 0),
  );

  const inventoryRetailValue = roundMoney(
    inventoryRows.reduce((sum, row) => sum + (row.stockRetailValue ?? 0), 0),
  );

  const inventoryPotentialProfit = roundMoney(
    inventoryRows.reduce(
      (sum, row) => sum + (row.potentialGrossProfit ?? 0),
      0,
    ),
  );

  const missingCostProducts = inventoryRows.filter(
    (row) => row.stock > 0 && row.costPrice == null,
  );

  const missingRetailProducts = inventoryRows.filter(
    (row) => row.stock > 0 && row.baseSellingPrice == null,
  );

  let totalRevenue = 0;
  let knownRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let missingCostLines = 0;
  let missingCostRevenue = 0;
  let quantityDealLines = 0;
  let quantityDealSavings = 0;

  const productMap = new Map<string, ProductPerformanceBucket>();
  const categoryMap = new Map<string, PerformanceBucket>();
  const ownerMap = new Map<string, PerformanceBucket>();

  for (const sale of sales) {
    for (const item of sale.items) {
      const revenue = toSafeNumber(item.lineTotal);
      const knownCost = hasValidCostSnapshot(item);
      const cost = knownCost ? toSafeNumber(item.lineCostTotal) : 0;
      const profit = knownCost ? toSafeNumber(item.lineProfit) : 0;

      totalRevenue += revenue;

      if (knownCost) {
        knownRevenue += revenue;
        totalCost += cost;
        totalProfit += profit;
      } else {
        missingCostLines += 1;
        missingCostRevenue += revenue;
      }

      const normalLineTotal = toSafeNumber(item.unitPrice) * item.quantity;
      const dealSaving = roundMoney(normalLineTotal - revenue);

      if (dealSaving > 0.009) {
        quantityDealLines += 1;
        quantityDealSavings += dealSaving;
      }

      const existingProduct = productMap.get(item.productId);
      if (existingProduct) {
        existingProduct.revenue += revenue;
        existingProduct.baseUnitsSold += item.quantityInBaseUnit;
        if (knownCost) {
          existingProduct.knownRevenue += revenue;
          existingProduct.cost += cost;
          existingProduct.profit += profit;
        } else {
          existingProduct.missingCostLines += 1;
        }
      } else {
        productMap.set(item.productId, {
          id: item.productId,
          name: item.product.name,
          baseUnitName: item.product.unit.name,
          baseUnitsSold: item.quantityInBaseUnit,
          revenue,
          knownRevenue: knownCost ? revenue : 0,
          cost: knownCost ? cost : 0,
          profit: knownCost ? profit : 0,
          missingCostLines: knownCost ? 0 : 1,
        });
      }

      const categoryId = item.product.categoryId;
      const existingCategory = categoryMap.get(categoryId);
      if (existingCategory) {
        existingCategory.revenue += revenue;
        if (knownCost) {
          existingCategory.knownRevenue += revenue;
          existingCategory.cost += cost;
          existingCategory.profit += profit;
        } else {
          existingCategory.missingCostLines += 1;
        }
      } else {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: item.product.category.name,
          revenue,
          knownRevenue: knownCost ? revenue : 0,
          cost: knownCost ? cost : 0,
          profit: knownCost ? profit : 0,
          missingCostLines: knownCost ? 0 : 1,
        });
      }

      const ownerId = item.product.ownerId;
      const existingOwner = ownerMap.get(ownerId);
      if (existingOwner) {
        existingOwner.revenue += revenue;
        if (knownCost) {
          existingOwner.knownRevenue += revenue;
          existingOwner.cost += cost;
          existingOwner.profit += profit;
        } else {
          existingOwner.missingCostLines += 1;
        }
      } else {
        ownerMap.set(ownerId, {
          id: ownerId,
          name: item.product.owner.name,
          revenue,
          knownRevenue: knownCost ? revenue : 0,
          cost: knownCost ? cost : 0,
          profit: knownCost ? profit : 0,
          missingCostLines: knownCost ? 0 : 1,
        });
      }
    }
  }

  totalRevenue = roundMoney(totalRevenue);
  knownRevenue = roundMoney(knownRevenue);
  totalCost = roundMoney(totalCost);
  totalProfit = roundMoney(totalProfit);
  missingCostRevenue = roundMoney(missingCostRevenue);
  quantityDealSavings = roundMoney(quantityDealSavings);

  const grossMargin =
    knownRevenue > 0 ? (totalProfit / knownRevenue) * 100 : 0;

  const costCoverage =
    totalRevenue > 0 ? (knownRevenue / totalRevenue) * 100 : 100;

  const productPerformance = Array.from(productMap.values())
    .map((row) => ({
      ...row,
      revenue: roundMoney(row.revenue),
      knownRevenue: roundMoney(row.knownRevenue),
      cost: roundMoney(row.cost),
      profit: roundMoney(row.profit),
      margin: marginPercent(row.profit, row.knownRevenue),
    }))
    .sort((a, b) => b.profit - a.profit);

  const categoryPerformance = Array.from(categoryMap.values())
    .map((row) => ({
      ...row,
      revenue: roundMoney(row.revenue),
      knownRevenue: roundMoney(row.knownRevenue),
      cost: roundMoney(row.cost),
      profit: roundMoney(row.profit),
      margin: marginPercent(row.profit, row.knownRevenue),
      activeProducts: products.filter(
        (product) => product.categoryId === row.id,
      ).length,
    }))
    .sort((a, b) => b.profit - a.profit);

  const ownerPerformance = Array.from(ownerMap.values())
    .map((row) => ({
      ...row,
      revenue: roundMoney(row.revenue),
      knownRevenue: roundMoney(row.knownRevenue),
      cost: roundMoney(row.cost),
      profit: roundMoney(row.profit),
      margin: marginPercent(row.profit, row.knownRevenue),
      activeProducts: products.filter((product) => product.ownerId === row.id)
        .length,
    }))
    .sort((a, b) => b.profit - a.profit);

  const completeMarginProducts = productPerformance.filter(
    (row) => row.knownRevenue > 0 && row.missingCostLines === 0,
  );

  const highestMarginProducts = [...completeMarginProducts]
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  const lowestMarginProducts = [...completeMarginProducts]
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 5);

  const highestValueInventory = [...inventoryRows]
    .filter((row) => row.stock > 0)
    .sort(
      (a, b) =>
        (b.stockCostValue ?? -1) - (a.stockCostValue ?? -1),
    )
    .slice(0, 10);

  const outstandingFromSelectedSales = roundMoney(
    sales.reduce((sum, sale) => sum + toSafeNumber(sale.balance), 0),
  );

  const totalCollectedFromSelectedSales = roundMoney(
    sales.reduce((sum, sale) => sum + toSafeNumber(sale.amountPaid), 0),
  );

  return {
    inventory: {
      activeProducts: products.length,
      inventoryCostValue,
      inventoryRetailValue,
      inventoryPotentialProfit,
      missingCostProducts,
      missingRetailProducts,
      highestValueInventory,
    },
    sales: {
      transactions: sales.length,
      totalRevenue,
      knownRevenue,
      totalCost,
      totalProfit,
      grossMargin,
      costCoverage,
      missingCostLines,
      missingCostRevenue,
      quantityDealLines,
      quantityDealSavings,
      outstandingFromSelectedSales,
      totalCollectedFromSelectedSales,
    },
    productPerformance,
    categoryPerformance,
    ownerPerformance,
    highestMarginProducts,
    lowestMarginProducts,
  };
}
