import Link from "next/link";
import { getSalesHistoryPage, getSalesHistorySummary } from "@/lib/db/sale-history";

type SalesHistoryPageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    paymentStatus?: string;
    from?: string;
    to?: string;
  }>;
};

function toNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function getPaymentStatus(sale: { amountPaid: unknown; balance: unknown }) {
  const amountPaid = Number(sale.amountPaid ?? 0);
  const balance = Number(sale.balance ?? 0);

  if (balance <= 0) return "paid";
  if (amountPaid > 0) return "partial";
  return "owed";
}

export default async function SalesHistoryPage({
  searchParams,
}: SalesHistoryPageProps) {
  const params = await searchParams;

  const page = Math.max(Number(params?.page ?? "1") || 1, 1);
  const q = params?.q?.trim() ?? "";
  const paymentStatus = params?.paymentStatus?.trim() ?? "";
  const from = params?.from?.trim() ?? "";
  const to = params?.to?.trim() ?? "";

  const [result, summary] = await Promise.all([
    getSalesHistoryPage({
      page,
      pageSize: 20,
      q,
      paymentStatus,
      from,
      to,
    }),
    getSalesHistorySummary({
      q,
      paymentStatus,
      from,
      to,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sales History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Durable sales ledger with filters, balances, and line-item detail.
          </p>
        </div>

        <Link
          href="/sales"
          className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Record New Sale
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Sales Count</p>
          <p className="mt-2 text-2xl font-semibold">{summary.salesCount}</p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Revenue</p>
          <p className="mt-2 text-2xl font-semibold">
            ₦{toNumber(summary.revenue).toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Profit</p>
          <p className="mt-2 text-2xl font-semibold">
            ₦{toNumber(summary.profit).toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Outstanding Balance</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            ₦{toNumber(summary.balance).toLocaleString()}
          </p>
        </div>
      </section>

      <form className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search customer or product"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />

        <select
          name="paymentStatus"
          defaultValue={paymentStatus}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">All payment status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="owed">Owed</option>
        </select>

        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />

        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply
          </button>

          <Link
            href="/sales/history"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
      </form>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Customer
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Items
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  Subtotal
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  Paid
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  Balance
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  Profit
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {result.sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No sales found for this filter.
                  </td>
                </tr>
              ) : (
                result.sales.map((sale) => {
                  const status = getPaymentStatus(sale);

                  return (
                    <tr key={sale.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {new Date(sale.createdAt).toLocaleString()}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {sale.customerName || "Walk-in Customer"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex max-w-md flex-wrap gap-2">
                          {sale.items.map((item) => (
                            <span
                              key={item.id}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                            >
                              {item.product.name} × {item.quantity}{" "}
                              {item.saleUnit?.unit?.name ?? ""}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-slate-900">
                        ₦{toNumber(sale.subtotal).toLocaleString()}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-900">
                        ₦{toNumber(sale.amountPaid).toLocaleString()}
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-red-600">
                        ₦{toNumber(sale.balance).toLocaleString()}
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-emerald-700">
                        ₦
                        {sale.items
                          .reduce((sum, item) => sum + toNumber(item.lineProfit), 0)
                          .toLocaleString()}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
                            status === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "partial"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <Link
              href={`/sales/history?page=${Math.max(
                1,
                page - 1,
              )}&q=${encodeURIComponent(q)}&paymentStatus=${encodeURIComponent(
                paymentStatus,
              )}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
              className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                page <= 1
                  ? "pointer-events-none border-slate-200 text-slate-300"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Previous
            </Link>

            <Link
              href={`/sales/history?page=${Math.min(
                totalPages,
                page + 1,
              )}&q=${encodeURIComponent(q)}&paymentStatus=${encodeURIComponent(
                paymentStatus,
              )}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
              className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                page >= totalPages
                  ? "pointer-events-none border-slate-200 text-slate-300"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}