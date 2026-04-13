import Link from "next/link";
import SummaryCard from "@/components/shared/summary-card";
import SectionCard from "@/components/shared/section-card";
import { getDashboardData } from "@/lib/db/dashboard";
import DashboardRangeFilter from "@/features/dashboard/component/dashboard-range-filter";

type DashboardPageProps = {
  searchParams?: Promise<{
    range?: string;
  }>;
};

type RestockProduct = {
  id: string;
  name: string;
  category: string;
  ownerName: string;
  stock: number;
  lowStock: number;
};

type RecentSale = {
  id: string;
  customerName: string;
  subtotal: number;
  balance: number;
};

type TopProduct = {
  name: string;
  revenue: number;
  quantity: number;
  profit: number;
};

type OwnerSummary = {
  ownerId: string;
  ownerName: string;
  productCount: number;
  salesAmount: number;
  profitAmount: number;
};

type DebtSummary = {
  id: string;
  customerName: string;
  balance: number;
};

function toSafeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function getDateRange(range: string | undefined) {
  const now = new Date();

  if (range === "today") {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    };
  }

  if (range === "7d") {
    const start = new Date();
    start.setDate(now.getDate() - 7);
    return { startDate: start, endDate: now };
  }

  if (range === "30d") {
    const start = new Date();
    start.setDate(now.getDate() - 30);
    return { startDate: start, endDate: now };
  }

  if (range === "month") {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: now,
    };
  }

  return {};
}

function formatMoney(value: number) {
  return `₦${value.toLocaleString()}`;
}

export const dynamic = "force-dynamic";

async function getDashboardView(range: string | undefined) {
  const filters = getDateRange(range);
  const { owners, products, sales, debts } = await getDashboardData(filters);

  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      totalRevenue += toSafeNumber(item.lineTotal);
      totalCost += toSafeNumber(item.lineCostTotal);
      totalProfit += toSafeNumber(item.lineProfit);
    });
  });

  const outstandingDebts = debts.reduce(
    (sum, debt) => sum + toSafeNumber(debt.balance),
    0,
  );

  const customersOwing = debts.filter(
    (debt) => toSafeNumber(debt.balance) > 0,
  ).length;

  const stockValue = products.reduce((sum, product) => {
    return sum + product.stock * toSafeNumber(product.currentCostPrice);
  }, 0);

  const potentialSalesValue = products.reduce((sum, product) => {
    const defaultSaleUnit =
      product.saleUnits.find((saleUnit) => saleUnit.isDefault) ??
      product.saleUnits[0];

    const sellingPrice = defaultSaleUnit
      ? toSafeNumber(defaultSaleUnit.sellingPrice)
      : 0;

    return sum + product.stock * sellingPrice;
  }, 0);

  const unrealizedStockMargin = potentialSalesValue - stockValue;

  const lowStockItems = products.filter(
    (product) => product.stock > 0 && product.stock <= product.lowStock,
  ).length;

  const outOfStockItems = products.filter(
    (product) => product.stock === 0,
  ).length;

  const profitMargin =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const debtRecoveryRate =
    totalRevenue > 0 ? ((totalRevenue - outstandingDebts) / totalRevenue) * 100 : 0;

  const restockPriority: RestockProduct[] = [...products]
    .filter((product) => product.stock <= product.lowStock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 4)
    .map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category.name,
      ownerName: product.owner.name,
      stock: product.stock,
      lowStock: product.lowStock,
    }));

  const ownerSummary: OwnerSummary[] = owners
    .map((owner) => {
      const ownerProducts = products.filter(
        (product) => product.ownerId === owner.id,
      );

      const ownerItems = sales
        .flatMap((sale) => sale.items)
        .filter((item) => item.product.ownerId === owner.id);

      const salesAmount = ownerItems.reduce(
        (sum, item) => sum + toSafeNumber(item.lineTotal),
        0,
      );

      const profitAmount = ownerItems.reduce(
        (sum, item) => sum + toSafeNumber(item.lineProfit),
        0,
      );

      return {
        ownerId: owner.id,
        ownerName: owner.name,
        productCount: ownerProducts.length,
        salesAmount,
        profitAmount,
      };
    })
    .sort((a, b) => b.profitAmount - a.profitAmount);

  const recentSales: RecentSale[] = sales.slice(0, 3).map((sale) => ({
    id: sale.id,
    customerName: sale.customerName || "Walk-in Customer",
    subtotal: toSafeNumber(sale.subtotal),
    balance: toSafeNumber(sale.balance),
  }));

  const productRevenueMap = new Map<
    string,
    { name: string; revenue: number; quantity: number; profit: number }
  >();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const existing = productRevenueMap.get(item.productId);

      if (existing) {
        existing.revenue += toSafeNumber(item.lineTotal);
        existing.quantity += item.quantity;
        existing.profit += toSafeNumber(item.lineProfit);
      } else {
        productRevenueMap.set(item.productId, {
          name: item.product.name,
          revenue: toSafeNumber(item.lineTotal),
          quantity: item.quantity,
          profit: toSafeNumber(item.lineProfit),
        });
      }
    });
  });

  const topProducts: TopProduct[] = Array.from(productRevenueMap.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 3);

  const topDebtors: DebtSummary[] = debts
    .filter((debt) => toSafeNumber(debt.balance) > 0)
    .sort((a, b) => toSafeNumber(b.balance) - toSafeNumber(a.balance))
    .slice(0, 4)
    .map((debt) => ({
      id: debt.id,
      customerName: debt.customerName,
      balance: toSafeNumber(debt.balance),
    }));

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin,
    outstandingDebts,
    customersOwing,
    stockValue,
    potentialSalesValue,
    unrealizedStockMargin,
    debtRecoveryRate,
    lowStockItems,
    outOfStockItems,
    restockPriority,
    ownerSummary,
    recentSales,
    topProducts,
    topDebtors,
  };
}

function rangeLabel(range: string | undefined) {
  if (range === "today") return "Today";
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  if (range === "month") return "This month";
  return "Today";
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const range = resolvedSearchParams?.range ?? "today";
  const data = await getDashboardView(range);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Store Overview
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">
            Real business metrics for revenue, cost, profit, stock value, and debts.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-start lg:justify-end">
          <div className="w-full sm:w-auto">
            <DashboardRangeFilter value={range} />
          </div>
          <span className="text-sm text-slate-500 sm:text-right">
            {rangeLabel(range)}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Revenue"
          value={formatMoney(data.totalRevenue)}
          note="Recorded sales value"
        />
        <SummaryCard
          title="Cost of Sales"
          value={formatMoney(data.totalCost)}
          note="Cost behind sold items"
        />
        <SummaryCard
          title="Gross Profit"
          value={formatMoney(data.totalProfit)}
          note="Revenue minus cost"
        />
        <SummaryCard
          title="Profit Margin"
          value={`${data.profitMargin.toFixed(1)}%`}
          note="Profit efficiency"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Current Stock Value"
          value={formatMoney(data.stockValue)}
          note="Based on cost price"
        />
        <SummaryCard
          title="Potential Sales Value"
          value={formatMoney(data.potentialSalesValue)}
          note="At default selling prices"
        />
        <SummaryCard
          title="Unrealized Stock Margin"
          value={formatMoney(data.unrealizedStockMargin)}
          note="Potential margin in stock"
        />
        <SummaryCard
          title="Outstanding Debts"
          value={formatMoney(data.outstandingDebts)}
          note="Money to recover"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Customers Owing"
          value={data.customersOwing}
          note="Active debt accounts"
        />
        <SummaryCard
          title="Debt Recovery Rate"
          value={`${Math.max(0, data.debtRecoveryRate).toFixed(1)}%`}
          note="Collected vs total sales"
        />
        <SummaryCard
          title="Low Stock Alerts"
          value={data.lowStockItems}
          note="Needs attention soon"
        />
        <SummaryCard
          title="Out of Stock"
          value={data.outOfStockItems}
          note="Immediate restock needed"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Business Snapshot"
          description="Quick read of where the store stands right now."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Sales Performance</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatMoney(data.totalRevenue)}
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                Profit: {formatMoney(data.totalProfit)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Inventory Position</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatMoney(data.stockValue)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Cost-based stock value
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Receivables</p>
              <p className="mt-2 text-lg font-semibold text-red-600">
                {formatMoney(data.outstandingDebts)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                From {data.customersOwing} customers
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Stock Opportunity</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatMoney(data.potentialSalesValue)}
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                Margin potential: {formatMoney(data.unrealizedStockMargin)}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Debt Watch"
          description="Customers with the highest outstanding balances."
        >
          <div className="space-y-3">
            {data.topDebtors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 sm:p-6">
                No outstanding debt right now.
              </div>
            ) : (
              data.topDebtors.map((debt) => (
                <div
                  key={debt.id}
                  className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-900">
                      {debt.customerName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Outstanding customer balance
                    </p>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    <p className="text-base font-semibold text-red-600">
                      {formatMoney(debt.balance)}
                    </p>
                    <Link
                      href={`/debts/${debt.id}`}
                      className="mt-1 inline-flex text-sm font-medium text-emerald-600 hover:underline"
                    >
                      Open ledger
                    </Link>
                  </div>
                </div>
              ))
            )}

            <div className="pt-1">
              <Link
                href="/debts"
                className="inline-flex text-sm font-medium text-emerald-600 hover:underline"
              >
                View all debts
              </Link>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Restock Priority"
          description="Products requiring the fastest action."
        >
          <div className="space-y-3">
            {data.restockPriority.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 sm:p-6">
                No urgent restock items right now.
              </div>
            ) : (
              data.restockPriority.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-900">
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {product.category} • {product.ownerName}
                    </p>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    <p
                      className={`font-semibold ${
                        product.stock === 0 ? "text-red-600" : "text-amber-600"
                      }`}
                    >
                      {product.stock === 0
                        ? "Out of stock"
                        : `${product.stock} left`}
                    </p>
                    <p className="text-sm text-slate-500">
                      Threshold: {product.lowStock}
                    </p>
                  </div>
                </div>
              ))
            )}

            <div className="pt-1">
              <Link
                href="/inventory"
                className="inline-flex text-sm font-medium text-emerald-600 hover:underline"
              >
                View inventory
              </Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Owner Summary"
          description="Revenue and profit contribution by owner."
        >
          <div className="space-y-3">
            {data.ownerSummary.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 sm:p-6">
                No owners yet.
              </div>
            ) : (
              data.ownerSummary.map((item) => (
                <div
                  key={item.ownerId}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">
                        {item.ownerName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.productCount} products
                      </p>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-base font-semibold text-slate-900">
                        Revenue: {formatMoney(item.salesAmount)}
                      </p>
                      <p className="text-sm font-medium text-emerald-700">
                        Profit: {formatMoney(item.profitAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="pt-1">
              <Link
                href="/reports"
                className="inline-flex text-sm font-medium text-emerald-600 hover:underline"
              >
                View reports
              </Link>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Recent Sales"
          description="Most recent transaction activity."
        >
          <div className="space-y-3">
            {data.recentSales.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 sm:p-6">
                No sales yet.
              </div>
            ) : (
              data.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-900">
                      {sale.customerName}
                    </p>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        sale.balance <= 0 ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {sale.balance <= 0 ? "Paid" : "Outstanding"}
                    </p>
                  </div>

                  <p className="shrink-0 text-base font-bold text-slate-900 sm:text-lg sm:text-right">
                    {formatMoney(sale.subtotal)}
                  </p>
                </div>
              ))
            )}

            <div className="pt-1">
              <Link
                href="/sales/history"
                className="inline-flex text-sm font-medium text-emerald-600 hover:underline"
              >
                View sales history
              </Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Top Products"
          description="Best-performing products by recorded profit."
        >
          <div className="space-y-3">
            {data.topProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 sm:p-6">
                No product sales yet.
              </div>
            ) : (
              data.topProducts.map((product) => (
                <div
                  key={product.name}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {product.quantity} unit(s) sold
                      </p>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-base font-semibold text-slate-900">
                        Revenue: {formatMoney(product.revenue)}
                      </p>
                      <p className="text-sm font-medium text-emerald-700">
                        Profit: {formatMoney(product.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="pt-1">
              <Link
                href="/reports"
                className="inline-flex text-sm font-medium text-emerald-600 hover:underline"
              >
                View reports
              </Link>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}