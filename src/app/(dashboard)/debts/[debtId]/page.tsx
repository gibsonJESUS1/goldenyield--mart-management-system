import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDebtById } from "@/lib/db/debt";

type DebtDetailPageProps = {
  params: Promise<{
    debtId: string;
  }>;
};

function formatTransactionType(type: string) {
  switch (type) {
    case "SALE_DEBT":
      return "Sale Debt";
    case "MANUAL_DEBT":
      return "Manual Debt";
    case "PAYMENT":
      return "Payment";
    case "ADJUSTMENT_INCREASE":
      return "Adjustment Increase";
    case "ADJUSTMENT_DECREASE":
      return "Adjustment Decrease";
    default:
      return type;
  }
}

function amountStyle(type: string) {
  if (type === "PAYMENT" || type === "ADJUSTMENT_DECREASE") {
    return "text-emerald-600";
  }

  if (type === "SALE_DEBT" || type === "MANUAL_DEBT") {
    return "text-red-600";
  }

  return "text-amber-600";
}

function amountPrefix(type: string) {
  return type === "PAYMENT" || type === "ADJUSTMENT_DECREASE" ? "-" : "+";
}

export default async function DebtDetailPage({ params }: DebtDetailPageProps) {
  const { debtId } = await params;
  const debt = await getCustomerDebtById(debtId);

  if (!debt) {
    notFound();
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {debt.customerName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Full customer debt ledger and transaction history.
          </p>
        </div>

        <Link
          href="/debts"
          className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to Debts
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Outstanding Balance</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            ₦{Number(debt.balance).toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Phone</p>
          <p className="mt-2 text-lg font-medium text-slate-900">
            {debt.phone || "—"}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Transactions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {debt.transactions.length}
          </p>
        </div>
      </section>

      {debt.note ? (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Note</h2>
          <p className="mt-2 text-sm text-slate-600">{debt.note}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>

        <div className="mt-4 space-y-3">
          {debt.transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No transactions yet.
            </div>
          ) : (
            debt.transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatTransactionType(transaction.type)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <p className={`font-semibold ${amountStyle(transaction.type)}`}>
                    {amountPrefix(transaction.type)}₦
                    {Number(transaction.amount).toLocaleString()}
                  </p>
                </div>

                {transaction.description ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {transaction.description}
                  </p>
                ) : null}

                {transaction.saleId ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Sale Ref: {transaction.saleId}
                  </p>
                ) : null}

                {transaction.reference ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Ref: {transaction.reference}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}