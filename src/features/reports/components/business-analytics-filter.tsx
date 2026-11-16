"use client";

import { useState } from "react";

type ProductOption = {
  id: string;
  name: string;
  active: boolean;
};

type Props = {
  range: string;
  startDate?: string;
  endDate?: string;
  productId?: string;
  products: ProductOption[];
};

export default function BusinessAnalyticsFilter({
  range: initialRange,
  startDate,
  endDate,
  productId = "",
  products,
}: Props) {
  const [range, setRange] = useState(initialRange);

  return (
    <form
      method="GET"
      className="grid w-full gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4 md:items-end"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">
          Period
        </span>
        <select
          name="range"
          value={range}
          onChange={(event) => {
            const nextRange = event.target.value;
            setRange(nextRange);
            if (nextRange !== "custom") {
              event.currentTarget.form?.requestSubmit();
            }
          }}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
        >
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="3months">Last 3 months</option>
          <option value="6months">Last 6 months</option>
          <option value="year">This year</option>
          <option value="custom">Custom dates</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">
          Product
        </span>
        <select
          name="productId"
          defaultValue={productId}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">All Products / Whole Business</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}{product.active ? "" : " (Archived)"}
            </option>
          ))}
        </select>
      </label>

      {range === "custom" ? (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              From
            </span>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              To
            </span>
            <div className="flex gap-2">
              <input
                type="date"
                name="endDate"
                defaultValue={endDate}
                required
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Apply
              </button>
            </div>
          </label>
        </>
      ) : (
        <div className="md:col-span-2 flex items-end">
          <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs leading-5 text-slate-500">
            Product reports deduct only expenses directly linked to that product.
            General shop expenses are deducted in the whole-business report.
          </p>
        </div>
      )}
    </form>
  );
}
