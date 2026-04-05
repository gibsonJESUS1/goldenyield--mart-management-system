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
  paymentStatus: "paid" | "partial" | "owed";
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

export const dynamic = "force-dynamic";

async function getDashboardView(range: string | undefined) {
  const filters = getDateRange(range);
  const { owners, products, sales, debts } = await getDashboardData(filters);

  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      totalRevenue += Number(item.total);
      totalCost += Number(item.costTotal ?? 0);
      totalProfit += Number(item.profit ?? 0);
    });
  });

  const outstandingDebts = debts.reduce(
    (sum, debt) => sum + Number(debt.totalDebt),
    0,
  );

  const lowStockItems = products.filter(
    (product) => product.stock > 0 && product.stock <= product.lowStock,
  ).length;

  const outOfStockItems = products.filter(
    (product) => product.stock === 0,
  ).length;

  const profitMargin =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

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
      const ownerProducts = products.filter((product) => product.ownerId === owner.id);

      const ownerItems = sales
        .flatMap((sale) => sale.items)
        .filter((item) => item.product.ownerId === owner.id);

      const salesAmount = ownerItems.reduce(
        (sum, item) => sum + Number(item.total),
        0,
      );

      const profitAmount = ownerItems.reduce(
        (sum, item) => sum + Number(item.profit ?? 0),
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
    subtotal: Number(sale.subtotal),
    paymentStatus: sale.paymentStatus,
  }));

  const productRevenueMap = new Map<
    string,
    { name: string; revenue: number; quantity: number; profit: number }
  >();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const existing = productRevenueMap.get(item.productId);

      if (existing) {
        existing.revenue += Number(item.total);
        existing.quantity += item.quantity;
        existing.profit += Number(item.profit ?? 0);
      } else {
        productRevenueMap.set(item.productId, {
          name: item.product.name,
          revenue: Number(item.total),
          quantity: item.quantity,
          profit: Number(item.profit ?? 0),
        });
      }
    });
  });

  const topProducts: TopProduct[] = Array.from(productRevenueMap.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 3);

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin,
    outstandingDebts,
    lowStockItems,
    outOfStockItems,
    restockPriority,
    ownerSummary,
    recentSales,
    topProducts,
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
            Quick signals for stock, debts, revenue, and profit.
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
          value={`₦${data.totalRevenue.toLocaleString()}`}
          note="Live from recorded sales"
        />
        <SummaryCard
          title="Cost"
          value={`₦${data.totalCost.toLocaleString()}`}
          note="Cost of goods sold"
        />
        <SummaryCard
          title="Profit"
          value={`₦${data.totalProfit.toLocaleString()}`}
          note="Gross profit"
        />
        <SummaryCard
          title="Profit Margin"
          value={`${data.profitMargin.toFixed(1)}%`}
          note="Profit efficiency"
        />
        <SummaryCard
          title="Outstanding Debts"
          value={`₦${data.outstandingDebts.toLocaleString()}`}
          note="Customer balances to recover"
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
        <SummaryCard
          title="Restock Priority"
          value={data.restockPriority.length}
          note="Urgent items in focus"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
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
                      className={`font-semibold ${product.stock === 0 ? "text-red-600" : "text-amber-600"
                        }`}
                    >
                      {product.stock === 0 ? "Out of stock" : `${product.stock} left`}
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
                View more
              </Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Owner Summary"
          description="Live product count, revenue, and profit by owner."
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
                        Revenue: ₦{item.salesAmount.toLocaleString()}
                      </p>
                      <p className="text-sm font-medium text-emerald-700">
                        Profit: ₦{item.profitAmount.toLocaleString()}
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
                View more
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
                      className={`mt-1 text-sm font-medium capitalize ${sale.paymentStatus === "paid"
                          ? "text-emerald-600"
                          : sale.paymentStatus === "partial"
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                    >
                      {sale.paymentStatus}
                    </p>
                  </div>

                  <p className="shrink-0 text-base font-bold text-slate-900 sm:text-lg sm:text-right">
                    ₦{sale.subtotal.toLocaleString()}
                  </p>
                </div>
              ))
            )}

            <div className="pt-1">
              <Link
                href="/sales"
                className="inline-flex text-sm font-medium text-emerald-600 hover:underline"
              >
                View more
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
                        Revenue: ₦{product.revenue.toLocaleString()}
                      </p>
                      <p className="text-sm font-medium text-emerald-700">
                        Profit: ₦{product.profit.toLocaleString()}
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
                View more
              </Link>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}