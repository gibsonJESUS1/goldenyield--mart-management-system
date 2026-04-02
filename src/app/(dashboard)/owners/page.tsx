"use client";

import { useEffect, useState } from "react";

type Owner = {
  id: string;
  name: string;
  role?: string | null;
  isActive?: boolean;
};

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOwners() {
    try {
      setLoading(true);
      const res = await fetch("/api/owners", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch owners");
      }

      const data: Owner[] = await res.json();
      setOwners(data);
    } catch (error) {
      console.error(error);
      alert("Failed to load owners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOwners();
  }, []);

  async function handleAddOwner() {
    const name = prompt("Owner name?");
    if (!name) return;

    const role = prompt("Owner role?") ?? "";

    try {
      const res = await fetch("/api/owners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, role }),
      });

      if (!res.ok) {
        throw new Error("Failed to create owner");
      }

      await loadOwners();
    } catch (error) {
      console.error(error);
      alert("Failed to create owner");
    }
  }

  async function handleEditOwner(owner: Owner) {
    const name = prompt("Edit owner name", owner.name);
    if (!name) return;

    const role = prompt("Edit owner role", owner.role ?? "") ?? "";

    try {
      const res = await fetch(`/api/owners/${owner.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, role }),
      });

      if (!res.ok) {
        throw new Error("Failed to update owner");
      }

      await loadOwners();
    } catch (error) {
      console.error(error);
      alert("Failed to update owner");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Owners</h1>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading owners...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Owners</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage product ownership profiles from the database.
          </p>
        </div>

        <button
          onClick={handleAddOwner}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
        >
          + Add Owner
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {owners.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No owners yet
                </td>
              </tr>
            ) : (
              owners.map((owner) => (
                <tr key={owner.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {owner.name}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {owner.role || "—"}
                  </td>

                  <td className="px-4 py-3">
                    {owner.isActive === false ? (
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
                      onClick={() => handleEditOwner(owner)}
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