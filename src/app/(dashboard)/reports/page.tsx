import SummaryCard from "@/components/shared/summary-card";
import SectionCard from "@/components/shared/section-card";
import { getDashboardData } from "@/lib/db/dashboard";
import ReportsRangeFilter from "@/features/reports/components/reports-range-filter";

type ReportsPageProps = {
  searchParams?: Promise<{
    range?: string;
  }>;
};

type OwnerPerformance = {
  ownerId: string;
  ownerName: string;
  sales: number;
  products: number;
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

function rangeLabel(range: string | undefined) {
  if (range === "today") return "Today";
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  if (range === "month") return "This month";
  return "Today";
}

async function getReportsView(range: string | undefined) {
  const filters = getDateRange(range);
  const { owners, products, sales, debts } = await getDashboardData(filters);

  const totalSales = sales.length;
  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.subtotal),
    0
  );
  const totalOutstanding = debts.reduce(
    (sum, debt) => sum + Number(debt.totalDebt),
    0
  );

  const paidSales = sales.filter((sale) => sale.paymentStatus === "paid").length;
  const partialSales = sales.filter(
    (sale) => sale.paymentStatus === "partial"
  ).length;
  const owedSales = sales.filter((sale) => sale.paymentStatus === "owed").length;

  const ownerSummary: OwnerPerformance[] = owners
    .map((owner) => {
      const ownerProducts = products.filter((product) => product.ownerId === owner.id);

      const ownerSales = sales
        .flatMap((sale) => sale.items)
        .filter((item) => item.product.ownerId === owner.id)
        .reduce((sum, item) => sum + Number(item.total), 0);

      return {
        ownerId: owner.id,
        ownerName: owner.name,
        sales: ownerSales,
        products: ownerProducts.length,
      };
    })
    .sort((a, b) => b.sales - a.sales);

  const productMap = new Map<
    string,
    { name: string; sold: number; revenue: number }
  >();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const existing = productMap.get(item.productId);

      if (existing) {
        existing.sold += item.quantity;
        existing.revenue += Number(item.total);
      } else {
        productMap.set(item.productId, {
          name: item.product.name,
          sold: item.quantity,
          revenue: Number(item.total),
        });
      }
    });
  });

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const lowStockSummary = products
    .filter((product) => product.stock <= product.lowStock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5)
    .map((product) => ({
      id: product.id,
      name: product.name,
      stock: product.stock,
      lowStock: product.lowStock,
    }));

  return {
    totalSales,
    totalRevenue,
    totalOutstanding,
    paidSales,
    partialSales,
    owedSales,
    ownerSummary,
    topProducts,
    lowStockSummary,
  };
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = await searchParams;
  const range = resolvedSearchParams?.range ?? "today";
  const data = await getReportsView(range);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">
            Review live sales, debt exposure, stock pressure, and owner performance.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-auto">
            <ReportsRangeFilter value={range} />
          </div>
          <span className="text-sm text-slate-500 sm:text-right">
            {rangeLabel(range)}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Total Sales Records"
          value={data.totalSales}
          note="Live from database"
        />
        <SummaryCard
          title="Total Revenue"
          value={`₦${data.totalRevenue.toLocaleString()}`}
          note="Gross recorded sales"
        />
        <SummaryCard
          title="Outstanding Balance"
          value={`₦${data.totalOutstanding.toLocaleString()}`}
          note="Unpaid customer balances"
        />
        <SummaryCard
          title="Paid Sales"
          value={data.paidSales}
          note="Fully settled transactions"
        />
        <SummaryCard
          title="Partial Sales"
          value={data.partialSales}
          note="Partially settled transactions"
        />
        <SummaryCard
          title="Owed Sales"
          value={data.owedSales}
          note="Completely unpaid transactions"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Owner Performance"
          description="Live sales and product coverage by owner."
        >
          <div className="space-y-3">
            {data.ownerSummary.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 sm:p-6">
                No owner data yet.
              </div>
            ) : (
              data.ownerSummary.map((item) => (
                <div
                  key={item.ownerId}
                  className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-900">
                      {item.ownerName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.products} tracked products
                    </p>
                  </div>

                  <p className="shrink-0 font-semibold text-slate-900 sm:text-right">
                    ₦{item.sales.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Top Products"
          description="Best-performing products by current recorded revenue."
        >
          <div className="space-y-3">
            {data.topProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 sm:p-6">
                No product sales yet.
              </div>
            ) : (
              data.topProducts.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.sold} unit(s) sold
                    </p>
                  </div>

                  <p className="shrink-0 font-semibold text-slate-900 sm:text-right">
                    ₦{item.revenue.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Low Stock Report"
        description="Products that need attention soon or immediately."
      >
        <div className="space-y-3">
          {data.lowStockSummary.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 sm:p-6">
              No low stock items right now.
            </div>
          ) : (
            data.lowStockSummary.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-900">
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Threshold: {item.lowStock}
                  </p>
                </div>

                <p
                  className={`shrink-0 font-semibold sm:text-right ${
                    item.stock === 0 ? "text-red-600" : "text-amber-600"
                  }`}
                >
                  {item.stock === 0 ? "Out of stock" : `${item.stock} left`}
                </p>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}