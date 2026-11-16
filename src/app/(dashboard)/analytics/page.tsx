import type { ReactNode } from "react";
import Link from "next/link";
import BusinessAnalyticsFilter from "@/features/reports/components/business-analytics-filter";
import {
  getAnalyticsProducts,
  getBusinessAnalytics,
} from "@/lib/db/business-analytics";
import {
  getAnalyticsGranularity,
  resolveAnalyticsRange,
  type AnalyticsRange,
} from "@/lib/report-period";

type AnalyticsPageProps = {
  searchParams: Promise<{
    range?: string;
    startDate?: string;
    endDate?: string;
    productId?: string;
  }>;
};

export const dynamic = "force-dynamic";

function normalizeRange(value?: string): AnalyticsRange {
  const allowed: AnalyticsRange[] = [
    "today",
    "week",
    "month",
    "3months",
    "6months",
    "year",
    "custom",
  ];

  return allowed.includes(value as AnalyticsRange)
    ? (value as AnalyticsRange)
    : "today";
}

function money(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}₦${Math.abs(value).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function ProfitValue({ value }: { value: number }) {
  return (
    <span className={value < 0 ? "text-red-600" : "text-emerald-700"}>
      {money(value)}
    </span>
  );
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams;
  const range = normalizeRange(params.range);
  const period = resolveAnalyticsRange(range, params.startDate, params.endDate);
  const granularity = getAnalyticsGranularity(period.startDate, period.endDate);
  const productId = params.productId || undefined;

  const [products, data] = await Promise.all([
    getAnalyticsProducts(),
    getBusinessAnalytics({
      startDate: period.startDate,
      endDate: period.endDate,
      productId,
      granularity,
    }),
  ]);

  const selectedProduct = productId
    ? products.find((product) => product.id === productId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profit Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sales, cost of goods, operating expenses and net profit by day,
            week, month, several months or year.
          </p>
        </div>

        <Link
          href="/expenses"
          className="inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Record Expense
        </Link>
      </div>

      <BusinessAnalyticsFilter
        range={range}
        startDate={params.startDate}
        endDate={params.endDate}
        productId={productId}
        products={products}
      />

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        <span className="font-semibold text-slate-900">Viewing:</span>{" "}
        {selectedProduct ? selectedProduct.name : "Whole Business"} • {period.label}
        {selectedProduct ? (
          <span className="ml-2 text-xs text-slate-500">
            Net profit here deducts only expenses directly assigned to this product.
          </span>
        ) : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Sales Revenue" value={money(data.summary.salesRevenue)} />
        <SummaryCard title="Cost of Goods" value={money(data.summary.costOfGoods)} />
        <SummaryCard
          title="Gross Profit"
          value={<ProfitValue value={data.summary.grossProfit} />}
        />
        <SummaryCard title="Expenses" value={money(data.summary.expenses)} />
        <SummaryCard
          title="Net Profit"
          value={<ProfitValue value={data.summary.netProfit} />}
          emphasized
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmallCard label="Sales Transactions" value={data.summary.salesCount.toLocaleString()} />
        <SmallCard label="Gross Margin" value={`${data.summary.grossMargin.toFixed(2)}%`} />
        <SmallCard label="Cost Coverage" value={`${data.summary.costCoverage.toFixed(2)}%`} />
        <SmallCard
          label="Pending Cost Revenue"
          value={money(data.summary.pendingCostRevenue)}
          warning={data.summary.pendingCostRevenue > 0}
        />
      </section>

      {data.summary.pendingCostRevenue > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          {money(data.summary.pendingCostRevenue)} of sales currently has no finalized
          cost/profit snapshot. This commonly happens while a Batch/Container is still
          open. Close the batch when it finishes and the cost/profit will be allocated.
        </div>
      ) : null}

      {data.summary.zeroSaleBatchLoss > 0 ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
          Zero-sale finished batch loss included in Cost of Goods: {money(data.summary.zeroSaleBatchLoss)}.
        </div>
      ) : null}

      <Section
        title={`Performance by ${granularity === "day" ? "Day" : granularity === "week" ? "Week" : "Month"}`}
        description="Gross Profit = Sales Revenue - Cost of Goods. Net Profit = Gross Profit - Expenses."
      >
        {data.timeline.length === 0 ? (
          <Empty text="No sales or expenses recorded for this period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Period</th>
                  <th className="px-3 py-3 text-right font-medium">Sales</th>
                  <th className="px-3 py-3 text-right font-medium">Cost</th>
                  <th className="px-3 py-3 text-right font-medium">Gross Profit</th>
                  <th className="px-3 py-3 text-right font-medium">Expenses</th>
                  <th className="px-3 py-3 text-right font-medium">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.timeline.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3 font-semibold text-slate-900">{row.label}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{money(row.revenue)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{money(row.costOfGoods)}</td>
                    <td className="px-3 py-3 text-right font-semibold">
                      <ProfitValue value={row.grossProfit} />
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">{money(row.expenses)}</td>
                    <td className="px-3 py-3 text-right font-bold">
                      <ProfitValue value={row.netProfit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {!selectedProduct ? (
        <Section
          title="Product Profitability"
          description="Select any product above for a dedicated day/week/month/year view. Product net profit deducts expenses specifically linked to that product."
        >
          {data.productPerformance.length === 0 ? (
            <Empty text="No product activity for this period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="border-b border-slate-200 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Product</th>
                    <th className="px-3 py-3 text-right font-medium">Sales</th>
                    <th className="px-3 py-3 text-right font-medium">Cost</th>
                    <th className="px-3 py-3 text-right font-medium">Gross Profit</th>
                    <th className="px-3 py-3 text-right font-medium">Direct Expenses</th>
                    <th className="px-3 py-3 text-right font-medium">Net Profit</th>
                    <th className="px-3 py-3 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.productPerformance.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{money(row.revenue)}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{money(row.costOfGoods)}</td>
                      <td className="px-3 py-3 text-right font-semibold">
                        <ProfitValue value={row.grossProfit} />
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700">{money(row.directExpenses)}</td>
                      <td className="px-3 py-3 text-right font-bold">
                        <ProfitValue value={row.netProfit} />
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700">
                        {row.pendingCostRevenue > 0 ? "Partial" : `${row.margin.toFixed(2)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      ) : (
        <Section
          title={`${selectedProduct.name} Detail`}
          description="This isolates the selected product's sales, cost, gross profit and directly assigned expenditure for the chosen period."
        >
          {data.productPerformance[0] ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Sales Revenue" value={money(data.productPerformance[0].revenue)} />
              <Metric label="Cost of Goods" value={money(data.productPerformance[0].costOfGoods)} />
              <Metric label="Gross Profit" value={money(data.productPerformance[0].grossProfit)} />
              <Metric label="Direct Expenses" value={money(data.productPerformance[0].directExpenses)} />
              <Metric label="Net Product Profit" value={money(data.productPerformance[0].netProfit)} />
              <Metric
                label="Pending Cost Revenue"
                value={money(data.productPerformance[0].pendingCostRevenue)}
              />
            </div>
          ) : (
            <Empty text="No sales, direct expenses or closed batch loss for this product in the selected period." />
          )}
        </Section>
      )}

      <Section
        title="Expense Breakdown"
        description={
          selectedProduct
            ? "Only expenses directly linked to this product are included here."
            : "All operating expenses recorded for the business in this period."
        }
      >
        {data.expenseCategories.length === 0 ? (
          <Empty text="No expenses recorded for this period." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.expenseCategories.map((row) => (
              <div key={row.category} className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{row.category}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{money(row.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  emphasized = false,
}: {
  title: string;
  value: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        emphasized
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SmallCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-bold ${warning ? "text-amber-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
      {text}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
