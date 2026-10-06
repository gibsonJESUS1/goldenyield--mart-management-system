"use client";

import { useState } from "react";

type ReportsRangeFilterProps = {
  value: string;
  startDate?: string;
  endDate?: string;
};

export default function ReportsRangeFilter({
  value,
  startDate,
  endDate,
}: ReportsRangeFilterProps) {
  const [range, setRange] = useState(value);

  return (
    <form
      method="GET"
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-end"
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
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 sm:w-auto"
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="month">This month</option>
          <option value="custom">Custom dates</option>
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
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              To
            </span>

            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Apply
          </button>
        </>
      ) : null}
    </form>
  );
}
