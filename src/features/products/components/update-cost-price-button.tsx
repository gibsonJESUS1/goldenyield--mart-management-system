"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UpdateCostPriceButtonProps = {
  productId: string;
  productName: string;
  currentCostPrice?: number;
};

export default function UpdateCostPriceButton({
  productId,
  productName,
  currentCostPrice = 0,
}: UpdateCostPriceButtonProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [costPrice, setCostPrice] = useState(
    currentCostPrice > 0 ? String(currentCostPrice) : "",
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const parsedCostPrice = Number(costPrice);

    if (!parsedCostPrice || parsedCostPrice <= 0) {
      alert("Enter a valid cost price.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/products/update-cost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          costPrice: parsedCostPrice,
          note: note.trim() || null,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Failed to update cost price");
      }

      setOpen(false);
      setNote("");
      router.refresh();
      alert("Cost price updated successfully.");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Failed to update cost price",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (saving) return;
    setOpen(false);
    setCostPrice(currentCostPrice > 0 ? String(currentCostPrice) : "");
    setNote("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        Update Cost
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Update Cost Price
                </h2>
                <p className="mt-1 text-sm text-slate-500">{productName}</p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Current Cost Price</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                ₦{currentCostPrice.toLocaleString()}
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  New Cost Price
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="Enter new cost price"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Note (Optional)
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why are you changing the cost price?"
                />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Cost Price"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}