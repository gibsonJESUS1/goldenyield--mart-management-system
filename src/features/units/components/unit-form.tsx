"use client";

import { useState } from "react";
import type { Unit } from "../types/unit";

type Props = {
  initialData?: Unit | null;
  onSave: (unit: Unit) => void;
  onClose: () => void;
};

export default function UnitForm({ initialData, onSave, onClose }: Props) {
  const isEditMode = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [symbol, setSymbol] = useState(initialData?.symbol ?? "");
  const [active, setActive] = useState(initialData?.active ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) return;

    onSave({
      id: initialData?.id ?? crypto.randomUUID(),
      name: name.trim(),
      symbol: symbol.trim(),
      active,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEditMode ? "Edit Unit" : "Add Unit"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEditMode
                ? "Update unit details and status."
                : "Create a unit for standardized product measurement."}
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4">
            <Field label="Unit Name">
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                placeholder="e.g. Bottle"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field label="Symbol / Short Form">
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                placeholder="e.g. bt, kg, pcs"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </Field>

            <Field label="Status">
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                value={active ? "active" : "inactive"}
                onChange={(e) => setActive(e.target.value === "active")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>

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
              {isEditMode ? "Save Changes" : "Save Unit"}
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