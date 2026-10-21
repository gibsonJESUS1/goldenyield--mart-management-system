"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FlexibleProductResponse = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  currentCostPrice?: number | null;
  weightTrackingEnabled?: boolean;
  weightStockGrams?: number;
  lowWeightStockGrams?: number;
  costPerKg?: number | null;
  pricePerKg?: number | null;
  allowVariablePiecePrice?: boolean;
  minPiecePrice?: number | null;
  maxPiecePrice?: number | null;
};

type Props = {
  productId: string;
  productName: string;
};

function numberText(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "" : String(value);
}

export default function FlexibleSaleConfigButton({
  productId,
  productName,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [baseUnitName, setBaseUnitName] = useState("");
  const [pieceStock, setPieceStock] = useState(0);
  const [pieceCost, setPieceCost] = useState<number | null>(null);

  const [weightEnabled, setWeightEnabled] = useState(false);
  const [weightStockKg, setWeightStockKg] = useState("");
  const [lowWeightKg, setLowWeightKg] = useState("");
  const [costPerKg, setCostPerKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");

  const [variablePieceEnabled, setVariablePieceEnabled] = useState(false);
  const [minPiecePrice, setMinPiecePrice] = useState("");
  const [maxPiecePrice, setMaxPiecePrice] = useState("");

  async function openSetup() {
    setOpen(true);
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/products/${productId}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as FlexibleProductResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load product.");
      }

      setBaseUnitName(data.unit);
      setPieceStock(Number(data.stock ?? 0));
      setPieceCost(
        data.currentCostPrice != null ? Number(data.currentCostPrice) : null,
      );

      setWeightEnabled(data.weightTrackingEnabled === true);
      setWeightStockKg(String(Number(data.weightStockGrams ?? 0) / 1000));
      setLowWeightKg(String(Number(data.lowWeightStockGrams ?? 0) / 1000));
      setCostPerKg(numberText(data.costPerKg));
      setPricePerKg(numberText(data.pricePerKg));

      setVariablePieceEnabled(data.allowVariablePiecePrice === true);
      setMinPiecePrice(numberText(data.minPiecePrice));
      setMaxPiecePrice(numberText(data.maxPiecePrice));
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load product.",
      );
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setError("");
  }

  async function saveSetup() {
    setError("");

    const weightKg = Number(weightStockKg || 0);
    const lowKg = Number(lowWeightKg || 0);

    if (!Number.isFinite(weightKg) || weightKg < 0) {
      setError("Weight stock must be 0kg or more.");
      return;
    }

    if (!Number.isFinite(lowKg) || lowKg < 0) {
      setError("Low-weight threshold must be 0kg or more.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/products/${productId}/flexible-config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weightTrackingEnabled: weightEnabled,
            weightStockGrams: Math.round(weightKg * 1000),
            lowWeightStockGrams: Math.round(lowKg * 1000),
            costPerKg:
              weightEnabled && costPerKg ? Number(costPerKg) : null,
            pricePerKg:
              weightEnabled && pricePerKg ? Number(pricePerKg) : null,
            allowVariablePiecePrice: variablePieceEnabled,
            minPiecePrice:
              variablePieceEnabled && minPiecePrice
                ? Number(minPiecePrice)
                : null,
            maxPiecePrice:
              variablePieceEnabled && maxPiecePrice
                ? Number(maxPiecePrice)
                : null,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to save flexible sale setup.",
        );
      }

      setOpen(false);
      router.refresh();
      alert(`"${productName}" flexible selling setup saved.`);
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save flexible sale setup.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openSetup}
        className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
      >
        Fish / Meat Selling
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4">
          <div className="mx-auto my-6 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Flexible Fish / Meat Selling
                </h2>
                <p className="mt-1 text-sm text-slate-500">{productName}</p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Close
              </button>
            </div>

            {loading ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Loading product...
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Count stock</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Current: {pieceStock} {baseUnitName}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Current cost / {baseUnitName}:{" "}
                    {pieceCost != null
                      ? `₦${pieceCost.toLocaleString()}`
                      : "Not set"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    For a whole fish sold by size, this count stock is what
                    decreases. The cashier does not have to weigh that fish.
                  </p>
                </div>

                <section className="rounded-2xl border border-slate-200 p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={weightEnabled}
                      onChange={(e) => setWeightEnabled(e.target.checked)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      <span className="block font-semibold text-slate-900">
                        Sell this product by weight (Kg)
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-slate-500">
                        Example: Sawa ₦3,500/kg or Panla ₦3,000/kg.
                      </span>
                    </span>
                  </label>

                  {weightEnabled ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label="Current weight stock (Kg)">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={weightStockKg}
                          onChange={(e) => setWeightStockKg(e.target.value)}
                          placeholder="e.g. 9.6"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>

                      <Field label="Low-weight alert (Kg)">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={lowWeightKg}
                          onChange={(e) => setLowWeightKg(e.target.value)}
                          placeholder="e.g. 2"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>

                      <Field label="Cost per Kg">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={costPerKg}
                          onChange={(e) => setCostPerKg(e.target.value)}
                          placeholder="e.g. 2800"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>

                      <Field label="Selling price per Kg">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pricePerKg}
                          onChange={(e) => setPricePerKg(e.target.value)}
                          placeholder="e.g. 3500"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>

                      <div className="sm:col-span-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                        Weight is stored internally in grams for accuracy.
                        Cashiers still enter and see kilograms.
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-slate-200 p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={variablePieceEnabled}
                      onChange={(e) =>
                        setVariablePieceEnabled(e.target.checked)
                      }
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      <span className="block font-semibold text-slate-900">
                        Sell individual pieces at a price based on size
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-slate-500">
                        No weighing required. The cashier enters the actual
                        piece price at the time of sale.
                      </span>
                    </span>
                  </label>

                  {variablePieceEnabled ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label="Normal minimum price">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={minPiecePrice}
                          onChange={(e) => setMinPiecePrice(e.target.value)}
                          placeholder="e.g. 1000"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>

                      <Field label="Normal maximum price">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={maxPiecePrice}
                          onChange={(e) => setMaxPiecePrice(e.target.value)}
                          placeholder="e.g. 1500"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>

                      <div className="sm:col-span-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                        The range is a cashier guide, not a hard limit.
                        An unusually small or large piece can still use another
                        legitimate price. The server still blocks selling below cost.
                      </div>
                    </div>
                  ) : null}
                </section>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                  Piece and weight balances are intentionally separate.
                  Selling one whole fish reduces the piece count only.
                  Selling 0.65kg reduces the weight balance by 650g only.
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={saveSetup}
                    disabled={saving}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Flexible Setup"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
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
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
