import SectionCard from "@/components/shared/section-card";
import SummaryCard from "@/components/shared/summary-card";
import ReportsRangeFilter from "@/features/reports/components/reports-range-filter";
import { getProfitabilityReport } from "@/lib/db/reports";

type ReportsPageProps = {
  searchParams?: Promise<{
    range?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return `₦${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function parseDateInput(value?: string) {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getDateRange(
  range: string,
  customStart?: string,
  customEnd?: string,
) {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  if (range === "7d") {
    return {
      startDate: addDays(today, -6),
      endDate: tomorrow,
    };
  }

  if (range === "30d") {
    return {
      startDate: addDays(today, -29),
      endDate: tomorrow,
    };
  }

  if (range === "month") {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: tomorrow,
    };
  }

  if (range === "custom") {
    const start = parseDateInput(customStart);
    const end = parseDateInput(customEnd);

    if (start && end && start.getTime() <= end.getTime()) {
      return {
        startDate: start,
        endDate: addDays(end, 1),
      };
    }
  }

  return {
    startDate: today,
    endDate: tomorrow,
  };
}

function rangeLabel(
  range: string,
  startDate?: string,
  endDate?: string,
) {
  if (range === "custom" && startDate && endDate) {
    return `${startDate} to ${endDate}`;
  }

  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  if (range === "month") return "This month";
  return "Today";
}

function MarginBadge({ margin }: { margin: number }) {
  const className =
    margin < 0
      ? "bg-red-50 text-red-700"
      : margin < 10
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${className}`}
    >
      {formatPercent(margin)}
    </span>
  );
}

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  const params = await searchParams;

  const requestedRange =
    params?.range === "7d" ||
    params?.range === "30d" ||
    params?.range === "month" ||
    params?.range === "custom"
      ? params.range
      : "today";

  const filters = getDateRange(
    requestedRange,
    params?.startDate,
    params?.endDate,
  );

  const data = await getProfitabilityReport(filters);

  const inventoryValuationIncomplete =
    data.inventory.missingCostProducts.length > 0 ||
    data.inventory.missingRetailProducts.length > 0;

  const actualProfitIncomplete = data.sales.missingCostLines > 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Stock Valuation & Profit Reports
          </h1>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
            Current inventory value uses today&apos;s product cost price.
            Historical profit uses the cost snapshot stored when each sale was made.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <ReportsRangeFilter
            value={requestedRange}
            startDate={params?.startDate}
            endDate={params?.endDate}
          />

          <p className="text-xs text-slate-500 xl:text-right">
            Sales period:{" "}
            <span className="font-semibold text-slate-700">
              {rangeLabel(
                requestedRange,
                params?.startDate,
                params?.endDate,
              )}
            </span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        <span className="font-semibold text-slate-800">Important:</span>{" "}
        stock valuation is a current snapshot and does not change with the date filter.
        Revenue, cost of goods sold, gross profit, margins, and performance tables do.
      </div>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900">
            Current Inventory Valuation
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Active products only. Retail value uses the normal selling price of one base unit.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Stock Value at Cost"
            value={formatMoney(data.inventory.inventoryCostValue)}
            note="What current stock cost the business"
          />

          <SummaryCard
            title="Current Retail Value"
            value={formatMoney(data.inventory.inventoryRetailValue)}
            note="At normal base-unit selling prices"
          />

          <SummaryCard
            title="Potential Gross Profit"
            value={formatMoney(data.inventory.inventoryPotentialProfit)}
            note="Retail value minus known stock cost"
          />

          <SummaryCard
            title="Missing Cost Prices"
            value={data.inventory.missingCostProducts.length}
            note="In-stock products needing cost price"
          />
        </div>
      </section>

      {inventoryValuationIncomplete ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          Inventory valuation is incomplete. {" "}
          {data.inventory.missingCostProducts.length > 0
            ? `${data.inventory.missingCostProducts.length} in-stock product(s) have no valid cost price. `
            : ""}
          {data.inventory.missingRetailProducts.length > 0
            ? `${data.inventory.missingRetailProducts.length} in-stock product(s) have no active base-unit selling price.`
            : ""}
        </div>
      ) : null}

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900">
            Actual Sales Profitability
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Calculated from sales recorded during the selected period.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Revenue"
            value={formatMoney(data.sales.totalRevenue)}
            note={`${data.sales.transactions} sale transaction(s)`}
          />

          <SummaryCard
            title="Cost of Goods Sold"
            value={formatMoney(data.sales.totalCost)}
            note="Historical cost snapshots"
          />

          <SummaryCard
            title="Gross Profit"
            value={formatMoney(data.sales.totalProfit)}
            note="Revenue with known cost minus COGS"
          />

          <SummaryCard
            title="Gross Margin"
            value={formatPercent(data.sales.grossMargin)}
            note="Based only on sales with known cost"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Cost Coverage"
          value={formatPercent(data.sales.costCoverage)}
          note="Revenue backed by a cost snapshot"
        />

        <SummaryCard
          title="Collected"
          value={formatMoney(data.sales.totalCollectedFromSelectedSales)}
          note="Amount paid on selected sales"
        />

        <SummaryCard
          title="Outstanding"
          value={formatMoney(data.sales.outstandingFromSelectedSales)}
          note="Balance on selected sales"
        />

        <SummaryCard
          title="Quantity Deal Savings"
          value={formatMoney(data.sales.quantityDealSavings)}
          note={`${data.sales.quantityDealLines} discounted sale line(s)`}
        />
      </section>

      {actualProfitIncomplete ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          Some older sale lines do not have a usable cost snapshot.
          Profit excludes those lines instead of treating their cost as zero.
          Missing-cost lines:{" "}
          <span className="font-semibold">{data.sales.missingCostLines}</span>.
          Revenue affected:{" "}
          <span className="font-semibold">
            {formatMoney(data.sales.missingCostRevenue)}
          </span>
          .
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Highest Margin Products"
          description="Only products with complete cost data for the selected period."
        >
          <div className="space-y-3">
            {data.highestMarginProducts.length === 0 ? (
              <EmptyState text="No complete product margin data for this period." />
            ) : (
              data.highestMarginProducts.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Profit {formatMoney(item.profit)} • Revenue{" "}
                      {formatMoney(item.revenue)}
                    </p>
                  </div>

                  <MarginBadge margin={item.margin} />
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Lowest Margin Products"
          description="Products whose selling performance deserves the closest pricing review."
        >
          <div className="space-y-3">
            {data.lowestMarginProducts.length === 0 ? (
              <EmptyState text="No complete product margin data for this period." />
            ) : (
              data.lowestMarginProducts.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Profit {formatMoney(item.profit)} • Revenue{" "}
                      {formatMoney(item.revenue)}
                    </p>
                  </div>

                  <MarginBadge margin={item.margin} />
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Product Profitability"
        description="Revenue, historical cost, profit, and margin by product."
      >
        {data.productPerformance.length === 0 ? (
          <EmptyState text="No product sales for this period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 text-right font-medium">
                    Base Units Sold
                  </th>
                  <th className="px-3 py-3 text-right font-medium">Revenue</th>
                  <th className="px-3 py-3 text-right font-medium">COGS</th>
                  <th className="px-3 py-3 text-right font-medium">Profit</th>
                  <th className="px-3 py-3 text-right font-medium">Margin</th>
                  <th className="px-3 py-3 text-right font-medium">Cost Gaps</th>
                </tr>
              </thead>

              <tbody>
                {data.productPerformance.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                    </td>

                    <td className="px-3 py-3 text-right text-slate-700">
                      {item.baseUnitsSold.toLocaleString()} {item.baseUnitName}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-700">
                      {formatMoney(item.revenue)}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-700">
                      {formatMoney(item.cost)}
                    </td>

                    <td
                      className={`px-3 py-3 text-right font-semibold ${
                        item.profit < 0 ? "text-red-600" : "text-emerald-700"
                      }`}
                    >
                      {formatMoney(item.profit)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {item.missingCostLines === 0 ? (
                        <MarginBadge margin={item.margin} />
                      ) : (
                        <span className="text-xs font-medium text-amber-700">
                          Partial
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {item.missingCostLines > 0 ? (
                        <span className="font-semibold text-amber-700">
                          {item.missingCostLines}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PerformanceTable
          title="Category Profitability"
          description="How each product category contributes to revenue and gross profit."
          rows={data.categoryPerformance}
          countLabel="Active Products"
        />

        <PerformanceTable
          title="Owner Profitability"
          description="Revenue and gross-profit contribution by product owner."
          rows={data.ownerPerformance}
          countLabel="Active Products"
        />
      </section>

      <SectionCard
        title="Highest-Value Inventory"
        description="Current in-stock products ranked by known acquisition cost value."
      >
        {data.inventory.highestValueInventory.length === 0 ? (
          <EmptyState text="No active stock available." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Owner</th>
                  <th className="px-3 py-3 text-right font-medium">Stock</th>
                  <th className="px-3 py-3 text-right font-medium">Cost / Base</th>
                  <th className="px-3 py-3 text-right font-medium">Stock Cost</th>
                  <th className="px-3 py-3 text-right font-medium">Retail Value</th>
                  <th className="px-3 py-3 text-right font-medium">
                    Potential Profit
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.inventory.highestValueInventory.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {item.name}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{item.category}</td>
                    <td className="px-3 py-3 text-slate-600">{item.ownerName}</td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      {item.stock.toLocaleString()} {item.baseUnitName}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      {formatMoney(item.costPrice)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(item.stockCostValue)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      {formatMoney(item.stockRetailValue)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-semibold ${
                        (item.potentialGrossProfit ?? 0) < 0
                          ? "text-red-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {formatMoney(item.potentialGrossProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {data.inventory.missingCostProducts.length > 0 ? (
        <SectionCard
          title="Products Missing Cost Price"
          description="These items prevent complete stock valuation and should be corrected."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {data.inventory.missingCostProducts.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
              >
                <p className="font-semibold text-slate-900">{item.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.stock.toLocaleString()} {item.baseUnitName} in stock •{" "}
                  {item.category}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 sm:p-6">
      {text}
    </div>
  );
}

type PerformanceTableRow = {
  id: string;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  missingCostLines: number;
  activeProducts: number;
};

function PerformanceTable({
  title,
  description,
  rows,
  countLabel,
}: {
  title: string;
  description: string;
  rows: PerformanceTableRow[];
  countLabel: string;
}) {
  return (
    <SectionCard title={title} description={description}>
      {rows.length === 0 ? (
        <EmptyState text="No sales data for this period." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 text-right font-medium">
                  {countLabel}
                </th>
                <th className="px-3 py-3 text-right font-medium">Revenue</th>
                <th className="px-3 py-3 text-right font-medium">Profit</th>
                <th className="px-3 py-3 text-right font-medium">Margin</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-3 py-3 font-semibold text-slate-900">
                    {item.name}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {item.activeProducts}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {formatMoney(item.revenue)}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-semibold ${
                      item.profit < 0 ? "text-red-600" : "text-emerald-700"
                    }`}
                  >
                    {formatMoney(item.profit)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {item.missingCostLines === 0 ? (
                      <MarginBadge margin={item.margin} />
                    ) : (
                      <span className="text-xs font-medium text-amber-700">
                        Partial
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
