"use client";

import { useState } from "react";
import type { DebtRecord } from "../types/debt";

type Props = {
  debt: DebtRecord;
  onSave: (payload: { debtId: string; amount: number; note: string }) => void;
  onClose: () => void;
};

export default function AddPaymentForm({ debt, onSave, onClose }: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    onSave({
      debtId: debt.id,
      amount: parsedAmount,
      note: note.trim(),
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Add Payment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Record payment for <span className="font-medium">{debt.customerName}</span>.
          </p>
        </div>

        <div className="mb-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Current Balance</p>
          <p className="mt-1 text-xl font-bold text-red-600">
            ₦{debt.balance.toLocaleString()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Payment Amount">
            <input
              type="number"
              min="1"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
              placeholder="e.g. 2000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>

          <Field label="Note (Optional)">
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
              placeholder="e.g. Customer paid part of old balance"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white shadow hover:bg-emerald-700"
            >
              Save Payment
            </button>
          </div>
        </form>
      </div>
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
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}