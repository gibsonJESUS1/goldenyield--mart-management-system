"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SummaryCard from "@/components/shared/summary-card";

type DebtTransactionType =
  | "SALE_DEBT"
  | "MANUAL_DEBT"
  | "PAYMENT"
  | "ADJUSTMENT_INCREASE"
  | "ADJUSTMENT_DECREASE";

type DebtTransaction = {
  id: string;
  type: DebtTransactionType;
  amount: number;
  description?: string | null;
  reference?: string | null;
  saleId?: string | null;
  createdAt: string;
};

type DebtRecord = {
  id: string;
  customerName: string;
  phone?: string | null;
  note?: string | null;
  balance: number;
  createdAt: string;
  updatedAt?: string;
  transactions: DebtTransaction[];
};

type AdjustmentMode = "increase" | "decrease";

type DebtView = "outstanding" | "settled" | "all";

export const dynamic = "force-dynamic";

function formatTransactionType(type: DebtTransactionType) {
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

function getTransactionAmountColor(type: DebtTransactionType) {
  if (
    type === "PAYMENT" ||
    type === "ADJUSTMENT_DECREASE"
  ) {
    return "text-emerald-600";
  }

  if (
    type === "SALE_DEBT" ||
    type === "MANUAL_DEBT"
  ) {
    return "text-red-600";
  }

  return "text-amber-600";
}

function getTransactionAmountPrefix(type: DebtTransactionType) {
  return type === "PAYMENT" ||
    type === "ADJUSTMENT_DECREASE"
    ? "-"
    : "+";
}

function getEmptyMessage(view: DebtView) {
  if (view === "outstanding") {
    return "No outstanding customer debts.";
  }

  if (view === "settled") {
    return "No settled debt accounts found.";
  }

  return "No debt records found.";
}

function getRangeLabel(range: string) {
  switch (range) {
    case "today":
      return "Today";

    case "week":
      return "This week";

    case "month":
      return "This month";

    case "all":
      return "All time";

    default:
      return range;
  }
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [debtView, setDebtView] =
    useState<DebtView>("outstanding");

  const [range, setRange] = useState("all");

  const [paymentTarget, setPaymentTarget] =
    useState<DebtRecord | null>(null);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [savingPayment, setSavingPayment] =
    useState(false);

  const [adjustmentTarget, setAdjustmentTarget] =
    useState<DebtRecord | null>(null);

  const [adjustmentAmount, setAdjustmentAmount] =
    useState("");

  const [adjustmentMode, setAdjustmentMode] =
    useState<AdjustmentMode>("increase");

  const [adjustmentNote, setAdjustmentNote] =
    useState("");

  const [savingAdjustment, setSavingAdjustment] =
    useState(false);

  async function loadDebts() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/debts?range=${range}`,
        {
          cache: "no-store",
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch debts");
      }

      const data = (await res.json()) as Array<{
        id: string;
        customerName: string;
        phone?: string | null;
        note?: string | null;
        balance: number;
        createdAt: string;
        updatedAt?: string;

        transactions: Array<{
          id: string;
          type: DebtTransactionType;
          amount: number;
          description?: string | null;
          reference?: string | null;
          saleId?: string | null;
          createdAt: string;
        }>;
      }>;

      setDebts(
        data.map((debt) => ({
          id: debt.id,

          customerName: debt.customerName,

          phone: debt.phone ?? null,

          note: debt.note ?? null,

          balance: Number(debt.balance),

          createdAt: new Date(
            debt.createdAt,
          ).toLocaleString(),

          updatedAt: debt.updatedAt
            ? new Date(
                debt.updatedAt,
              ).toLocaleString()
            : undefined,

          transactions: debt.transactions.map(
            (transaction) => ({
              ...transaction,

              amount: Number(
                transaction.amount,
              ),

              createdAt: new Date(
                transaction.createdAt,
              ).toLocaleString(),
            }),
          ),
        })),
      );
    } catch (error) {
      console.error(error);

      alert("Failed to load debts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDebts();
  }, [range]);

  const totalDebts = debts.length;

  const outstandingDebts = useMemo(
    () =>
      debts.filter(
        (debt) => debt.balance > 0,
      ),
    [debts],
  );

  const settledDebts = useMemo(
    () =>
      debts.filter(
        (debt) => debt.balance <= 0,
      ),
    [debts],
  );

  const outstandingCount =
    outstandingDebts.length;

  const settledCount =
    settledDebts.length;

  const totalOutstanding =
    outstandingDebts.reduce(
      (sum, debt) => sum + debt.balance,
      0,
    );

  const filteredDebts = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return debts.filter((debt) => {
      const matchesSearch =
        !normalizedSearch ||
        debt.customerName
          .toLowerCase()
          .includes(normalizedSearch) ||
        debt.phone
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesView =
        debtView === "all"
          ? true
          : debtView === "outstanding"
            ? debt.balance > 0
            : debt.balance <= 0;

      return matchesSearch && matchesView;
    });
  }, [debts, search, debtView]);

  async function handleRecordPayment() {
    if (!paymentTarget) {
      return;
    }

    const amount = Number(paymentAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      alert(
        "Enter a valid payment amount",
      );

      return;
    }

    if (amount > paymentTarget.balance) {
      alert(
        `Payment cannot exceed ₦${paymentTarget.balance.toLocaleString()}.`,
      );

      return;
    }

    setSavingPayment(true);

    try {
      const res = await fetch(
        "/api/debts/payment",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            customerDebtId:
              paymentTarget.id,

            amount,
          }),
        },
      );

      const data = (await res.json()) as {
        message?: string;
      };

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to record payment",
        );
      }

      setPaymentTarget(null);

      setPaymentAmount("");

      await loadDebts();

      alert(
        "Payment recorded successfully.",
      );
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to record payment",
      );
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleAdjustment() {
    if (!adjustmentTarget) {
      return;
    }

    const amount = Number(
      adjustmentAmount,
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      alert(
        "Enter a valid adjustment amount",
      );

      return;
    }

    if (
      adjustmentMode === "decrease" &&
      amount > adjustmentTarget.balance
    ) {
      alert(
        `Decrease cannot exceed the current balance of ₦${adjustmentTarget.balance.toLocaleString()}.`,
      );

      return;
    }

    setSavingAdjustment(true);

    try {
      const res = await fetch(
        "/api/debts/adjustment",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            customerDebtId:
              adjustmentTarget.id,

            amount,

            direction:
              adjustmentMode,

            note:
              adjustmentNote,
          }),
        },
      );

      const data = (await res.json()) as {
        message?: string;
      };

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to adjust debt",
        );
      }

      setAdjustmentTarget(null);

      setAdjustmentAmount("");

      setAdjustmentMode("increase");

      setAdjustmentNote("");

      await loadDebts();

      alert(
        "Debt adjusted successfully.",
      );
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to adjust debt",
      );
    } finally {
      setSavingAdjustment(false);
    }
  }

  function closePaymentModal() {
    setPaymentTarget(null);

    setPaymentAmount("");
  }

  function closeAdjustmentModal() {
    setAdjustmentTarget(null);

    setAdjustmentAmount("");

    setAdjustmentMode("increase");

    setAdjustmentNote("");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Debts
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Track customer balances,
            payments and debt history.
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
        <h1 className="text-3xl font-bold text-slate-900">
          Debts
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Track outstanding customer
          balances while keeping settled
          accounts and full debt history.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Debt Accounts"
          value={totalDebts}
        />

        <SummaryCard
          title="Outstanding Customers"
          value={outstandingCount}
        />

        <SummaryCard
          title="Settled Accounts"
          value={settledCount}
        />

        <SummaryCard
          title="Total Outstanding"
          value={`₦${totalOutstanding.toLocaleString()}`}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setDebtView(
                "outstanding",
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              debtView ===
              "outstanding"
                ? "bg-red-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Outstanding (
            {outstandingCount})
          </button>

          <button
            type="button"
            onClick={() =>
              setDebtView("settled")
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              debtView === "settled"
                ? "bg-emerald-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Settled History (
            {settledCount})
          </button>

          <button
            type="button"
            onClick={() =>
              setDebtView("all")
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              debtView === "all"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            All Accounts (
            {totalDebts})
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700">
            Transaction period
          </label>

          <select
            value={range}
            onChange={(e) =>
              setRange(e.target.value)
            }
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="all">
              All time
            </option>

            <option value="today">
              Today
            </option>

            <option value="week">
              This week
            </option>

            <option value="month">
              This month
            </option>
          </select>

          <p className="text-sm text-slate-500">
            Showing transaction history
            for:{" "}
            <span className="font-medium text-slate-700">
              {getRangeLabel(range)}
            </span>
          </p>
        </div>

        <input
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 lg:max-w-sm"
          placeholder="Search customer or phone..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />
      </section>

      <section className="space-y-4">
        {filteredDebts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {getEmptyMessage(debtView)}
          </div>
        ) : (
          filteredDebts.map(
            (debt) => (
              <div
                key={debt.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-lg font-bold text-slate-900">
                        {
                          debt.customerName
                        }
                      </h2>

                      {debt.balance >
                      0 ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                          Outstanding
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                          Settled
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Account created:{" "}
                      {debt.createdAt}
                    </p>

                    {debt.phone ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {
                          debt.phone
                        }
                      </p>
                    ) : null}

                    {debt.note ? (
                      <p className="mt-1 text-sm text-slate-600">
                        {
                          debt.note
                        }
                      </p>
                    ) : null}
                  </div>

                  <div className="md:text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Current Balance
                    </p>

                    <p
                      className={`mt-1 text-xl font-bold ${
                        debt.balance >
                        0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }`}
                    >
                      ₦
                      {debt.balance.toLocaleString()}
                    </p>

                    <p className="text-sm text-slate-500">
                      {debt.balance >
                      0
                        ? "Outstanding"
                        : "Cleared"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                  {debt.balance >
                  0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentTarget(
                          debt,
                        )
                      }
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      Record Payment
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentTarget(
                        debt,
                      );

                      setAdjustmentMode(
                        debt.balance >
                          0
                          ? "decrease"
                          : "increase",
                      );
                    }}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
                  >
                    Adjust Debt
                  </button>

                  <Link
                    href={`/debts/${debt.id}`}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    View Full Ledger
                  </Link>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Transaction
                      History
                    </h3>

                    <span className="text-xs text-slate-400">
                      {
                        debt
                          .transactions
                          .length
                      }{" "}
                      transaction
                      {debt
                        .transactions
                        .length ===
                      1
                        ? ""
                        : "s"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {debt
                      .transactions
                      .length ===
                    0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        No transactions
                        found for{" "}
                        {getRangeLabel(
                          range,
                        ).toLowerCase()}
                        .
                      </div>
                    ) : (
                      debt.transactions.map(
                        (
                          transaction,
                        ) => (
                          <div
                            key={
                              transaction.id
                            }
                            className="rounded-xl bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-slate-900">
                                  {formatTransactionType(
                                    transaction.type,
                                  )}
                                </p>

                                <p className="text-sm text-slate-500">
                                  {
                                    transaction.createdAt
                                  }
                                </p>
                              </div>

                              <p
                                className={`font-semibold ${getTransactionAmountColor(
                                  transaction.type,
                                )}`}
                              >
                                {getTransactionAmountPrefix(
                                  transaction.type,
                                )}
                                ₦
                                {transaction.amount.toLocaleString()}
                              </p>
                            </div>

                            {transaction.description ? (
                              <p className="mt-2 text-sm text-slate-600">
                                {
                                  transaction.description
                                }
                              </p>
                            ) : null}

                            {transaction.reference ? (
                              <p className="mt-1 text-xs text-slate-500">
                                Ref:{" "}
                                {
                                  transaction.reference
                                }
                              </p>
                            ) : null}
                          </div>
                        ),
                      )
                    )}
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </section>

      {paymentTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Record Payment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Record payment for{" "}
                  {
                    paymentTarget.customerName
                  }
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closePaymentModal
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Current Outstanding
              </p>

              <p className="mt-1 text-xl font-bold text-red-600">
                ₦
                {paymentTarget.balance.toLocaleString()}
              </p>
            </div>

            <div className="space-y-4">
              <Field label="Payment Amount">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={
                    paymentTarget.balance
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  value={
                    paymentAmount
                  }
                  onChange={(e) =>
                    setPaymentAmount(
                      e.target.value,
                    )
                  }
                  placeholder="Enter amount paid"
                />
              </Field>

              <button
                type="button"
                onClick={() =>
                  setPaymentAmount(
                    String(
                      paymentTarget.balance,
                    ),
                  )
                }
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Use full outstanding
                amount
              </button>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={
                    closePaymentModal
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleRecordPayment
                  }
                  disabled={
                    savingPayment
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPayment
                    ? "Saving..."
                    : "Save Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {adjustmentTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Adjust Debt
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Adjust debt for{" "}
                  {
                    adjustmentTarget.customerName
                  }
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeAdjustmentModal
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Current Outstanding
              </p>

              <p
                className={`mt-1 text-xl font-bold ${
                  adjustmentTarget.balance >
                  0
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                ₦
                {adjustmentTarget.balance.toLocaleString()}
              </p>
            </div>

            <div className="space-y-4">
              <Field label="Adjustment Type">
                <select
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                  value={
                    adjustmentMode
                  }
                  onChange={(e) =>
                    setAdjustmentMode(
                      e.target
                        .value as AdjustmentMode,
                    )
                  }
                >
                  <option value="increase">
                    Increase Debt
                  </option>

                  <option
                    value="decrease"
                    disabled={
                      adjustmentTarget.balance <=
                      0
                    }
                  >
                    Decrease Debt
                  </option>
                </select>
              </Field>

              <Field label="Amount">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={
                    adjustmentMode ===
                    "decrease"
                      ? adjustmentTarget.balance
                      : undefined
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                  value={
                    adjustmentAmount
                  }
                  onChange={(e) =>
                    setAdjustmentAmount(
                      e.target.value,
                    )
                  }
                  placeholder="Enter amount"
                />
              </Field>

              <Field label="Note (Optional)">
                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                  value={
                    adjustmentNote
                  }
                  onChange={(e) =>
                    setAdjustmentNote(
                      e.target.value,
                    )
                  }
                  placeholder="Why are you adjusting this debt?"
                />
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={
                    closeAdjustmentModal
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleAdjustment
                  }
                  disabled={
                    savingAdjustment
                  }
                  className="rounded-xl bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingAdjustment
                    ? "Saving..."
                    : "Save Adjustment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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