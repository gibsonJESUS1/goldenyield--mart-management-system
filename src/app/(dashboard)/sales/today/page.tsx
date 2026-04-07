import { TodaySalesTable } from "@/features/sales/components/today-sales-table";
import { getTodaySaleItems, getTodaySalesSummary } from "@/lib/db/sale";

export default async function TodaySalesPage() {
  const [items, summary] = await Promise.all([
    getTodaySaleItems(),
    getTodaySalesSummary(),
  ]);

  const normalizedItems = items.map((item) => ({
    id: item.id,
    productName: item.product.name,
    quantity: item.quantity,
    quantityInBaseUnit: item.quantityInBaseUnit,
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(item.lineTotal),
    lineProfit: Number(item.lineProfit ?? 0),
    saleUnitName: item.saleUnit?.unit?.name ?? null,
    saleId: item.sale.id,
    customerName: item.sale.customerName,
    amountPaid: Number(item.sale.amountPaid),
    balance: Number(item.sale.balance),
    saleCreatedAt: item.sale.createdAt,
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Today Sales</h1>
        <p className="mt-1 text-sm text-gray-600">
          See all products sold today as they are recorded.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Sales Count</p>
          <p className="mt-2 text-2xl font-semibold">{summary.salesCount}</p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary.revenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Profit</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary.profit.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Outstanding Balance</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary.balance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      <TodaySalesTable items={normalizedItems} />
    </div>
  );
}