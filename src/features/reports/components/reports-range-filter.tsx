"use client";

type ReportsRangeFilterProps = {
  value: string;
};

export default function ReportsRangeFilter({
  value,
}: ReportsRangeFilterProps) {
  return (
    <form>
      <select
        name="range"
        defaultValue={value}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 sm:w-auto"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="today">Today</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="month">This month</option>
      </select>
    </form>
  );
}