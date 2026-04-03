"use client";

import { useEffect, useMemo, useState } from "react";
import SummaryCard from "@/components/shared/summary-card";

type DebtTransaction = {
  id: string;
  type: "sale" | "payment" | "adjustment";
  amount: number;
  note?: string | null;
  createdAt: string;
};

type DebtRecord = {
  id: string;
  customerName: string;
  totalDebt: number;
  createdAt: string;
  transactions: DebtTransaction[];
};

type AdjustmentMode = "increase" | "decrease";
export const dynamic = "force-dynamic";
export default function DebtsPage() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [paymentTarget, setPaymentTarget] = useState<DebtRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
const  [range, setRange] = useState("today")
  const [adjustmentTarget, setAdjustmentTarget] = useState<DebtRecord | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentMode>("increase");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  async function loadDebts() {
    try {
      setLoading(true);

      const res = await fetch(`/api/debts?range=${range}`, {
  cache: "no-store",
});

      if (!res.ok) {
        throw new Error("Failed to fetch debts");
      }

      const data = (await res.json()) as Array<{
        id: string;
        customerName: string;
        totalDebt: number;
        createdAt: string;
        transactions: Array<{
          id: string;
          type: "sale" | "payment" | "adjustment";
          amount: number;
          note?: string | null;
          createdAt: string;
        }>;
      }>;

      setDebts(
        data.map((debt) => ({
          id: debt.id,
          customerName: debt.customerName,
          totalDebt: debt.totalDebt,
          createdAt: new Date(debt.createdAt).toLocaleString(),
          transactions: debt.transactions.map((transaction) => ({
            ...transaction,
            createdAt: new Date(transaction.createdAt).toLocaleString(),
          })),
        }))
      );
    } catch (error) {
      console.error(error);
      alert("Failed to load debts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDebts();
  }, [range]);

  const filteredDebts = useMemo(() => {
    return debts.filter((debt) =>
      debt.customerName.toLowerCase().includes(search.toLowerCase())
    );
  }, [debts, search]);

  const totalDebts = debts.length;
  const outstandingCount = debts.filter((debt) => debt.totalDebt > 0).length;
  const totalOutstanding = debts.reduce((sum, debt) => sum + debt.totalDebt, 0);

  async function handleRecordPayment() {
    if (!paymentTarget) return;

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert("Enter a valid payment amount");
      return;
    }

    setSavingPayment(true);

    try {
      const res = await fetch("/api/debts/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: paymentTarget.customerName,
          amount,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record payment");
      }

      setPaymentTarget(null);
      setPaymentAmount("");
      await loadDebts();
      alert("Payment recorded successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleAdjustment() {
    if (!adjustmentTarget) return;

    const amount = Number(adjustmentAmount);
    if (!amount || amount <= 0) {
      alert("Enter a valid adjustment amount");
      return;
    }

    setSavingAdjustment(true);

    try {
      const res = await fetch("/api/debts/adjustment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: adjustmentTarget.customerName,
          amount,
          mode: adjustmentMode,
          note: adjustmentNote,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to adjust debt");
      }

      setAdjustmentTarget(null);
      setAdjustmentAmount("");
      setAdjustmentMode("increase");
      setAdjustmentNote("");
      await loadDebts();
      alert("Debt adjusted successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to adjust debt");
    } finally {
      setSavingAdjustment(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Debts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track customer balances and record payments.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading debts...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Debts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Real debt ledger from sales, with payment and adjustment tracking.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Debt Records" value={totalDebts} />
        <SummaryCard title="Outstanding Customers" value={outstandingCount} />
        <SummaryCard
          title="Total Outstanding"
          value={`₦${totalOutstanding.toLocaleString()}`}
        />
      </section>
      <div className="flex flex-wrap items-center gap-3">
  <select
    value={range}
    onChange={(e) => setRange(e.target.value)}
    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
  >
    <option value="today">Today</option>
    <option value="7d">Last 7 days</option>
    <option value="30d">Last 30 days</option>
    <option value="month">This month</option>
  </select>

  <p className="text-sm text-slate-500">
    Showing data for: <span className="font-medium">{range}</span>
  </p>
</div>

      <div className="flex items-center">
        <input
          className="w-full max-w-md rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
          placeholder="Search by customer name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <section className="space-y-4">
        {filteredDebts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            No debt records found.
          </div>
        ) : (
          filteredDebts.map((debt) => (
            <div
              key={debt.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {debt.customerName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{debt.createdAt}</p>
                </div>

                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${
                      debt.totalDebt > 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    ₦{debt.totalDebt.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500">
                    {debt.totalDebt > 0 ? "Outstanding" : "Cleared"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => setPaymentTarget(debt)}
                  disabled={debt.totalDebt <= 0}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Record Payment
                </button>

                <button
                  onClick={() => setAdjustmentTarget(debt)}
                  className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Adjust Debt
                </button>
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Transaction History
                </h3>

                <div className="mt-3 space-y-3">
                  {debt.transactions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      No transactions yet.
                    </div>
                  ) : (
                    debt.transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium text-slate-900 capitalize">
                              {transaction.type}
                            </p>
                            <p className="text-sm text-slate-500">
                              {transaction.createdAt}
                            </p>
                          </div>

                          <p
                            className={`font-semibold ${
                              transaction.type === "payment"
                                ? "text-emerald-600"
                                : transaction.type === "sale"
                                ? "text-red-600"
                                : "text-amber-600"
                            }`}
                          >
                            {transaction.type === "payment" ? "-" : "+"}₦
                            {transaction.amount.toLocaleString()}
                          </p>
                        </div>

                        {transaction.note ? (
                          <p className="mt-2 text-sm text-slate-600">
                            {transaction.note}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Record Payment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Record payment for {paymentTarget.customerName}.
                </p>
              </div>

              <button
                onClick={() => {
                  setPaymentTarget(null);
                  setPaymentAmount("");
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Current Outstanding</p>
              <p className="mt-1 text-xl font-bold text-red-600">
                ₦{paymentTarget.totalDebt.toLocaleString()}
              </p>
            </div>

            <div className="space-y-4">
              <Field label="Payment Amount">
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount paid"
                />
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTarget(null);
                    setPaymentAmount("");
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleRecordPayment}
                  disabled={savingPayment}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingPayment ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adjustmentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Adjust Debt
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Adjust debt for {adjustmentTarget.customerName}.
                </p>
              </div>

              <button
                onClick={() => {
                  setAdjustmentTarget(null);
                  setAdjustmentAmount("");
                  setAdjustmentMode("increase");
                  setAdjustmentNote("");
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Current Outstanding</p>
              <p className="mt-1 text-xl font-bold text-red-600">
                ₦{adjustmentTarget.totalDebt.toLocaleString()}
              </p>
            </div>

            <div className="space-y-4">
              <Field label="Adjustment Type">
                <select
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                  value={adjustmentMode}
                  onChange={(e) =>
                    setAdjustmentMode(e.target.value as AdjustmentMode)
                  }
                >
                  <option value="increase">Increase Debt</option>
                  <option value="decrease">Decrease Debt</option>
                </select>
              </Field>

              <Field label="Amount">
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </Field>

              <Field label="Note (Optional)">
                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="Why are you adjusting this debt?"
                />
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentTarget(null);
                    setAdjustmentAmount("");
                    setAdjustmentMode("increase");
                    setAdjustmentNote("");
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAdjustment}
                  disabled={savingAdjustment}
                  className="rounded-xl bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {savingAdjustment ? "Saving..." : "Save Adjustment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}