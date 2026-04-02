"use client";

import { useEffect, useState } from "react";

type Unit = {
  id: string;
  name: string;
  symbol?: string | null;
  isActive?: boolean;
};

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUnits() {
    try {
      setLoading(true);

      const res = await fetch("/api/units", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch units");
      }

      const data: Unit[] = await res.json();
      setUnits(data);
    } catch (error) {
      console.error(error);
      alert("Failed to load units");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUnits();
  }, []);

  async function handleAddUnit() {
    const name = prompt("Unit name?");
    if (!name) return;

    const symbol = prompt("Unit symbol?") ?? "";

    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, symbol }),
      });

      if (!res.ok) {
        throw new Error("Failed to create unit");
      }

      await loadUnits();
    } catch (error) {
      console.error(error);
      alert("Failed to create unit");
    }
  }

  async function handleEditUnit(unit: Unit) {
    const name = prompt("Edit unit name", unit.name);
    if (!name) return;

    const symbol = prompt("Edit unit symbol", unit.symbol ?? "") ?? "";

    try {
      const res = await fetch(`/api/units/${unit.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, symbol }),
      });

      if (!res.ok) {
        throw new Error("Failed to update unit");
      }

      await loadUnits();
    } catch (error) {
      console.error(error);
      alert("Failed to update unit");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Units</h1>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading units...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Units</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage product units from the database.
          </p>
        </div>

        <button
          onClick={handleAddUnit}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
        >
          + Add Unit
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {units.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No units yet
                </td>
              </tr>
            ) : (
              units.map((unit) => (
                <tr key={unit.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {unit.name}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {unit.symbol || "—"}
                  </td>

                  <td className="px-4 py-3">
                    {unit.isActive === false ? (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        Inactive
                      </span>
                    ) : (
                      <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
                        Active
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEditUnit(unit)}
                      className="text-sm font-medium text-emerald-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}