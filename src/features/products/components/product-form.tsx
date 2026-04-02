"use client";

import { useMemo, useState } from "react";
import type { Product, OwnerId } from "../types/product";
import { CATEGORIES, OWNERS, UNITS } from "../types/constants";

type Props = {
  initialData?: Product | null;
  onSave: (product: Product) => void;
  onClose: () => void;
};

type FormState = {
  name: string;
  category: string;
  ownerId: OwnerId | "";
  unit: string;
  price: string;
  stock: string;
  lowStock: string;
  active: boolean;
};

function getInitialFormState(initialData?: Product | null): FormState {
  if (!initialData) {
    return {
      name: "",
      category: "",
      ownerId: "",
      unit: "",
      price: "",
      stock: "",
      lowStock: "",
      active: true,
    };
  }

  return {
    name: initialData.name,
    category: initialData.category,
    ownerId: initialData.ownerId,
    unit: initialData.unit,
    price: String(initialData.price),
    stock: String(initialData.stock),
    lowStock: String(initialData.lowStock),
    active: initialData.active,
  };
}

export default function ProductForm({ initialData, onSave, onClose }: Props) {
  const isEditMode = !!initialData;

  const [form, setForm] = useState<FormState>(() =>
    getInitialFormState(initialData)
  );

  const selectedOwner = useMemo(
    () => OWNERS.find((owner) => owner.id === form.ownerId),
    [form.ownerId]
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !form.name ||
      !form.category ||
      !form.ownerId ||
      !form.unit ||
      !form.price ||
      !form.stock ||
      !form.lowStock
    ) {
      return;
    }

    onSave({
      id: initialData?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      category: form.category,
      ownerId: form.ownerId,
      ownerName: selectedOwner?.name ?? "",
      unit: form.unit,
      price: Number(form.price),
      stock: Number(form.stock),
      lowStock: Number(form.lowStock),
      active: form.active,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEditMode ? "Edit Product" : "Add Product"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEditMode
                ? "Update product details, stock, and ownership."
                : "Create a new product and assign it to the correct owner."}
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
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product Name">
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                placeholder="e.g. Garri"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </Field>

            <Field label="Category">
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                required
              >
                <option value="">Select category</option>
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Owner">
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                value={form.ownerId}
                onChange={(e) => updateField("ownerId", e.target.value as OwnerId)}
                required
              >
                <option value="">Select owner</option>
                {OWNERS.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Unit">
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
                required
              >
                <option value="">Select unit</option>
                {UNITS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Selling Price">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                placeholder="e.g. 2300"
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
                required
              />
            </Field>

            <Field label="Stock Quantity">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                placeholder="e.g. 18"
                value={form.stock}
                onChange={(e) => updateField("stock", e.target.value)}
                required
              />
            </Field>

            <Field label="Low Stock Threshold">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                placeholder="e.g. 5"
                value={form.lowStock}
                onChange={(e) => updateField("lowStock", e.target.value)}
                required
              />
            </Field>

            <Field label="Status">
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                value={form.active ? "active" : "inactive"}
                onChange={(e) => updateField("active", e.target.value === "active")}
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
              {isEditMode ? "Save Changes" : "Save Product"}
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