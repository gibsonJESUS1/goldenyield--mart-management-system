"use client";

import { useState } from "react";
import type { InventoryItem } from "../types/inventory";

type Props = {
  item: InventoryItem;
  onSave: (payload: {
    productId: string;
    quantityAdded: number;
    note: string;
  }) => void;
  onClose: () => void;
};

export default function RestockForm({ item, onSave, onClose }: Props) {
  const [quantityAdded, setQuantityAdded] = useState("");
  const [note, setNote] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsedQty = Number(quantityAdded);
    if (!parsedQty || parsedQty <= 0) return;

    onSave({
      productId: item.id,
      quantityAdded: parsedQty,
      note: note.trim(),
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Restock Product</h2>
            <p className="mt-1 text-sm text-slate-500">
              Update stock quantity for <span className="font-medium">{item.name}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mb-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Current Stock</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {item.stock} {item.unit}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Quantity to Add">
            <input
              type="number"
              min="1"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
              placeholder="e.g. 10"
              value={quantityAdded}
              onChange={(e) => setQuantityAdded(e.target.value)}
              required
            />
          </Field>

          <Field label="Note (Optional)">
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
              placeholder="e.g. New stock from market purchase"
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
              Save Restock
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