"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  productId: string;
  productName: string;
};

type Mode = "restock" | "adjust";

export default function InventoryActionButton({
  productId,
  productName,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("restock");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setQuantity("");
    setNote("");
    setMode("restock");
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  async function handleSubmit() {
    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity === 0) {
      alert("Enter a valid whole number quantity.");
      return;
    }

    if (mode === "restock" && parsedQuantity < 1) {
      alert("Restock quantity must be greater than 0.");
      return;
    }

    setSaving(true);

    try {
      const endpoint =
        mode === "restock"
          ? "/api/inventory/restock"
          : "/api/inventory/adjust";

      const payload = {
        productId,
        quantity: parsedQuantity,
        note: note.trim(),
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${mode} stock`);
      }

      closeModal();
      router.refresh();
      alert(
        mode === "restock"
          ? "Product restocked successfully."
          : "Stock adjusted successfully.",
      );
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("restock");
            setOpen(true);
          }}
          className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Restock
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("adjust");
            setOpen(true);
          }}
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Adjust
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {mode === "restock" ? "Restock Product" : "Adjust Stock"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{productName}</p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Quantity
                </span>
                <input
                  type="number"
                  step="1"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder={
                    mode === "restock"
                      ? "e.g. 20"
                      : "Use positive or negative, e.g. 5 or -3"
                  }
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Note
                </span>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder={
                    mode === "restock"
                      ? "e.g. New stock arrived from supplier"
                      : "e.g. Damaged items removed or count correction"
                  }
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>

              {mode === "adjust" ? (
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Positive number adds stock. Negative number removes stock.
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : mode === "restock"
                      ? "Save Restock"
                      : "Save Adjustment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}