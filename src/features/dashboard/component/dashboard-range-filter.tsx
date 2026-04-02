"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type DashboardRangeFilterProps = {
  value: string;
};

export default function DashboardRangeFilter({
  value,
}: DashboardRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!nextValue || nextValue === "today") {
      params.delete("range");
    } else {
      params.set("range", nextValue);
    }

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.push(nextUrl);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="dashboard-range" className="sr-only">
        Filter range
      </label>

      <select
        id="dashboard-range"
        name="range"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="today">Today</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="month">This month</option>
      </select>
    </div>
  );
}