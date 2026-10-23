"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PiecePriceOption = {
  id?: string;
  key: string;
  label: string;
  sellingPrice: string;
  costPrice: string;
};

type BatchInfo = {
  id: string;
  containerType: string;
  reference: string | null;
  totalCost: number;
  status: "ACTIVE" | "LOW" | "FINISHED";
  note: string | null;
  startedAt: string;
  finishedAt: string | null;
  closedRevenue: number | null;
  closedProfit: number | null;
  salesCount: number;
  revenue: number;
};

type BatchConfigResponse = {
  product: {
    id: string;
    name: string;
    countStock: number;
    weightStockGrams: number;
  };
  activeBatch: BatchInfo | null;
  recentBatches: BatchInfo[];
  error?: string;
};

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
  piecePriceOptions?: Array<{
    id: string;
    label: string;
    sellingPrice: number;
    costPrice: number;
    active: boolean;
    sortOrder: number;
  }>;
};

type Props = {
  productId: string;
  productName: string;
};

function numberText(
  value: number | null | undefined,
) {
  return value == null ||
    !Number.isFinite(value)
    ? ""
    : String(value);
}

function createKey() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

export default function FlexibleSaleConfigButton({
  productId,
  productName,
}: Props) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");

  const [
    baseUnitName,
    setBaseUnitName,
  ] = useState("");

  const [pieceStock, setPieceStock] =
    useState(0);

  const [pieceCost, setPieceCost] =
    useState<number | null>(null);

  const [weightEnabled, setWeightEnabled] =
    useState(false);

  const [
    weightStockKg,
    setWeightStockKg,
  ] = useState("");

  const [lowWeightKg, setLowWeightKg] =
    useState("");

  const [costPerKg, setCostPerKg] =
    useState("");

  const [pricePerKg, setPricePerKg] =
    useState("");

  const [
    variablePieceEnabled,
    setVariablePieceEnabled,
  ] = useState(false);

  const [
    minPiecePrice,
    setMinPiecePrice,
  ] = useState("");

  const [
    maxPiecePrice,
    setMaxPiecePrice,
  ] = useState("");

  const [
    piecePriceOptions,
    setPiecePriceOptions,
  ] = useState<PiecePriceOption[]>([]);

  const [batchSaving, setBatchSaving] = useState(false);
  const [activeBatch, setActiveBatch] = useState<BatchInfo | null>(null);
  const [recentBatches, setRecentBatches] = useState<BatchInfo[]>([]);
  const [batchContainerType, setBatchContainerType] = useState("Basket");
  const [batchCost, setBatchCost] = useState("");
  const [batchReference, setBatchReference] = useState("");
  const [batchNote, setBatchNote] = useState("");

  async function openSetup() {
    setOpen(true);
    setLoading(true);
    setError("");

    try {
      const [productResponse, batchResponse] = await Promise.all([
        fetch(`/api/products/${productId}`, {
          cache: "no-store",
        }),
        fetch(`/api/products/${productId}/batch-config`, {
          cache: "no-store",
        }),
      ]);

      const data =
        (await productResponse.json()) as FlexibleProductResponse & {
          error?: string;
        };

      const batchData =
        (await batchResponse.json()) as BatchConfigResponse;

      if (!productResponse.ok) {
        throw new Error(
          data.error || "Failed to load product.",
        );
      }

      if (!batchResponse.ok) {
        throw new Error(
          batchData.error || "Failed to load batch setup.",
        );
      }

      setBaseUnitName(data.unit);
      setPieceStock(Number(data.stock ?? 0));

      setPieceCost(
        data.currentCostPrice != null
          ? Number(data.currentCostPrice)
          : null,
      );

      setWeightEnabled(
        data.weightTrackingEnabled === true,
      );

      setWeightStockKg(
        String(
          Number(data.weightStockGrams ?? 0) / 1000,
        ),
      );

      setLowWeightKg(
        String(
          Number(data.lowWeightStockGrams ?? 0) / 1000,
        ),
      );

      setCostPerKg(numberText(data.costPerKg));
      setPricePerKg(numberText(data.pricePerKg));

      setVariablePieceEnabled(
        data.allowVariablePiecePrice === true,
      );

      setMinPiecePrice(numberText(data.minPiecePrice));
      setMaxPiecePrice(numberText(data.maxPiecePrice));

      setPiecePriceOptions(
        (data.piecePriceOptions ?? []).map((option) => ({
          id: option.id,
          key: option.id,
          label: option.label,
          sellingPrice: String(option.sellingPrice),
          costPrice: String(option.costPrice),
        })),
      );

      setActiveBatch(batchData.activeBatch);
      setRecentBatches(batchData.recentBatches ?? []);
    } catch (loadError) {
      console.error(loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load product.",
      );
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    if (saving || batchSaving) {
      return;
    }

    setOpen(false);
    setError("");
  }

  function addPiecePriceOption() {
    setPiecePriceOptions(
      (previous) => [
        ...previous,
        {
          key: createKey(),
          label: "",
          sellingPrice: "",
          costPrice: "",
        },
      ],
    );
  }

  function updatePiecePriceOption(
    key: string,
    field:
      | "label"
      | "sellingPrice"
      | "costPrice",
    value: string,
  ) {
    setPiecePriceOptions(
      (previous) =>
        previous.map((option) =>
          option.key === key
            ? {
                ...option,
                [field]: value,
              }
            : option,
        ),
    );
  }

  function removePiecePriceOption(
    key: string,
  ) {
    setPiecePriceOptions(
      (previous) =>
        previous.filter(
          (option) =>
            option.key !== key,
        ),
    );
  }

  async function startBatch() {
    setError("");

    const totalCost = Number(batchCost);

    if (!batchContainerType.trim()) {
      setError("Enter a container type such as Basket, Crate or Bag.");
      return;
    }

    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      setError("Enter the total purchase cost of this batch.");
      return;
    }

    setBatchSaving(true);

    try {
      const response = await fetch(
        `/api/products/${productId}/batch-config`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            containerType: batchContainerType.trim(),
            reference: batchReference.trim() || null,
            totalCost,
            note: batchNote.trim() || null,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to start batch.",
        );
      }

      setBatchCost("");
      setBatchReference("");
      setBatchNote("");
      setActiveBatch(data.activeBatch ?? null);
      setRecentBatches(data.recentBatches ?? []);
      router.refresh();
    } catch (batchError) {
      console.error(batchError);
      setError(
        batchError instanceof Error
          ? batchError.message
          : "Failed to start batch.",
      );
    } finally {
      setBatchSaving(false);
    }
  }

  async function updateBatch(
    action: "MARK_LOW" | "MARK_ACTIVE" | "CLOSE",
  ) {
    if (!activeBatch) {
      return;
    }

    if (action === "CLOSE") {
      const confirmed = window.confirm(
        `Close this ${activeBatch.containerType} batch?\n\n` +
          "The system will finalize its total revenue, allocate the purchase cost across its sales, and calculate the real batch profit.",
      );

      if (!confirmed) {
        return;
      }
    }

    setError("");
    setBatchSaving(true);

    try {
      const response = await fetch(
        `/api/products/${productId}/batch-config`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            batchId: activeBatch.id,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update batch.",
        );
      }

      setActiveBatch(data.activeBatch ?? null);
      setRecentBatches(data.recentBatches ?? []);
      router.refresh();
    } catch (batchError) {
      console.error(batchError);
      setError(
        batchError instanceof Error
          ? batchError.message
          : "Failed to update batch.",
      );
    } finally {
      setBatchSaving(false);
    }
  }

  async function saveSetup() {
    setError("");

    const weightKg = Number(
      weightStockKg || 0,
    );

    const lowKg = Number(
      lowWeightKg || 0,
    );

    if (
      !Number.isFinite(weightKg) ||
      weightKg < 0
    ) {
      setError(
        "Weight stock must be 0kg or more.",
      );
      return;
    }

    if (
      !Number.isFinite(lowKg) ||
      lowKg < 0
    ) {
      setError(
        "Low-weight threshold must be 0kg or more.",
      );
      return;
    }

    const normalizedPieceOptions =
      variablePieceEnabled
        ? piecePriceOptions.map(
            (option) => ({
              label:
                option.label.trim(),
              sellingPrice: Number(
                option.sellingPrice,
              ),
              costPrice: Number(
                option.costPrice,
              ),
            }),
          )
        : [];

    if (
      normalizedPieceOptions.length > 0
    ) {
      for (
        let index = 0;
        index <
        normalizedPieceOptions.length;
        index += 1
      ) {
        const option =
          normalizedPieceOptions[index];

        if (!option.label) {
          setError(
            `Piece option ${index + 1} needs a name.`,
          );
          return;
        }

        if (
          !Number.isFinite(
            option.sellingPrice,
          ) ||
          option.sellingPrice <= 0
        ) {
          setError(
            `${option.label}: enter a valid selling price.`,
          );
          return;
        }

        if (
          !Number.isFinite(
            option.costPrice,
          ) ||
          option.costPrice <= 0
        ) {
          setError(
            `${option.label}: enter a valid cost price.`,
          );
          return;
        }

        if (
          option.sellingPrice <
          option.costPrice
        ) {
          setError(
            `${option.label}: selling price cannot be below cost.`,
          );
          return;
        }
      }
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/products/${productId}/flexible-config`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            weightTrackingEnabled:
              weightEnabled,

            weightStockGrams:
              Math.round(
                weightKg * 1000,
              ),

            lowWeightStockGrams:
              Math.round(
                lowKg * 1000,
              ),

            costPerKg:
              weightEnabled &&
              costPerKg
                ? Number(costPerKg)
                : null,

            pricePerKg:
              weightEnabled &&
              pricePerKg
                ? Number(pricePerKg)
                : null,

            allowVariablePiecePrice:
              variablePieceEnabled,

            minPiecePrice:
              variablePieceEnabled &&
              normalizedPieceOptions.length ===
                0 &&
              minPiecePrice
                ? Number(
                    minPiecePrice,
                  )
                : null,

            maxPiecePrice:
              variablePieceEnabled &&
              normalizedPieceOptions.length ===
                0 &&
              maxPiecePrice
                ? Number(
                    maxPiecePrice,
                  )
                : null,

            piecePriceOptions:
              normalizedPieceOptions,
          }),
        },
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to save flexible sale setup.",
        );
      }

      setOpen(false);
      router.refresh();

      alert(
        `"${productName}" flexible selling setup saved.`,
      );
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
        Flexible / Batch Selling
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4">
          <div className="mx-auto my-6 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Flexible Product Selling
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {productName}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving || batchSaving}
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
                  <p className="font-semibold text-slate-900">
                    Count stock
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Current: {pieceStock}{" "}
                    {baseUnitName}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Default cost /{" "}
                    {baseUnitName}:{" "}
                    {pieceCost != null
                      ? `₦${pieceCost.toLocaleString()}`
                      : "Not set"}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    For configured portion prices,
                    each size can have its own cost.
                    The default base cost remains the
                    fallback for manual piece pricing.
                  </p>
                </div>

                <section className="rounded-2xl border border-slate-200 p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={weightEnabled}
                      onChange={(event) =>
                        setWeightEnabled(
                          event.target.checked,
                        )
                      }
                      className="mt-1 h-4 w-4"
                    />

                    <span>
                      <span className="block font-semibold text-slate-900">
                        Sell this product by weight
                        (Kg)
                      </span>

                      <span className="mt-1 block text-sm leading-5 text-slate-500">
                        Example: Sawa or raw Panla
                        sold by actual weight.
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
                          onChange={(event) =>
                            setWeightStockKg(
                              event.target.value,
                            )
                          }
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
                          onChange={(event) =>
                            setLowWeightKg(
                              event.target.value,
                            )
                          }
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
                          onChange={(event) =>
                            setCostPerKg(
                              event.target.value,
                            )
                          }
                          placeholder="e.g. 3000"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>

                      <Field label="Selling price per Kg">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pricePerKg}
                          onChange={(event) =>
                            setPricePerKg(
                              event.target.value,
                            )
                          }
                          placeholder="e.g. 3800"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>

                      <div className="sm:col-span-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                        Weight is stored internally in
                        grams for accuracy. Cashiers
                        enter and see kilograms.
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-slate-200 p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={variablePieceEnabled}
                      onChange={(event) =>
                        setVariablePieceEnabled(
                          event.target.checked,
                        )
                      }
                      className="mt-1 h-4 w-4"
                    />

                    <span>
                      <span className="block font-semibold text-slate-900">
                        Sell individual pieces / portions
                        by size
                      </span>

                      <span className="mt-1 block text-sm leading-5 text-slate-500">
                        Use manual pricing for whole fish
                        such as Sawa, or configure fixed
                        portion prices for products such
                        as Fried Panla.
                      </span>
                    </span>
                  </label>

                  {variablePieceEnabled ? (
                    <div className="mt-4 space-y-4">
                      {piecePriceOptions.length ===
                      0 ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Normal minimum price">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={minPiecePrice}
                              onChange={(event) =>
                                setMinPiecePrice(
                                  event.target.value,
                                )
                              }
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
                              onChange={(event) =>
                                setMaxPiecePrice(
                                  event.target.value,
                                )
                              }
                              placeholder="e.g. 1500"
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                            />
                          </Field>

                          <div className="sm:col-span-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                            Manual mode is best for a
                            whole fish whose price is
                            judged by size. The base-unit
                            cost is used for profit.
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-800">
                          Configured portion mode is
                          active. Each option has its own
                          selling price and cost price.
                        </div>
                      )}

                      <div className="space-y-3">
                        {piecePriceOptions.map(
                          (option, index) => (
                            <div
                              key={option.key}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-800">
                                  Portion option{" "}
                                  {index + 1}
                                </p>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removePiecePriceOption(
                                      option.key,
                                    )
                                  }
                                  className="text-sm font-medium text-red-600 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3">
                                <Field label="Name / size">
                                  <input
                                    value={option.label}
                                    onChange={(event) =>
                                      updatePiecePriceOption(
                                        option.key,
                                        "label",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="e.g. Small"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-500"
                                  />
                                </Field>

                                <Field label="Selling price">
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={
                                      option.sellingPrice
                                    }
                                    onChange={(event) =>
                                      updatePiecePriceOption(
                                        option.key,
                                        "sellingPrice",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="e.g. 200"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-500"
                                  />
                                </Field>

                                <Field label="Cost price">
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={
                                      option.costPrice
                                    }
                                    onChange={(event) =>
                                      updatePiecePriceOption(
                                        option.key,
                                        "costPrice",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="e.g. 150"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-500"
                                  />
                                </Field>
                              </div>
                            </div>
                          ),
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={addPiecePriceOption}
                        className="rounded-xl border border-violet-300 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        + Add Portion Price & Cost
                      </button>

                      <p className="text-xs leading-5 text-slate-500">
                        Example for Fried Panla: Small
                        ₦200 / cost ₦150, Medium ₦500 /
                        cost ₦350, Large ₦1,000 / cost
                        ₦700. Use your real batch costs,
                        not these example figures.
                      </p>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Batch / Container Selling
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Best for pepper, tomatoes, onions, vegetables and similar goods bought as a basket, crate or bag when exact count or weight is not reliable.
                    </p>
                  </div>

                  {activeBatch ? (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              Active {activeBatch.containerType} batch
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Status: <span className="font-semibold">{activeBatch.status}</span>
                            </p>
                          </div>

                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            activeBatch.status === "LOW"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {activeBatch.status}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-slate-500">Purchase cost</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              ₦{activeBatch.totalCost.toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-slate-500">Sales so far</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              ₦{activeBatch.revenue.toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-slate-500">Transactions</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {activeBatch.salesCount}
                            </p>
                          </div>
                        </div>

                        {activeBatch.reference ? (
                          <p className="mt-3 text-xs text-slate-500">
                            Reference: {activeBatch.reference}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() =>
                              updateBatch(
                                activeBatch.status === "LOW"
                                  ? "MARK_ACTIVE"
                                  : "MARK_LOW",
                              )
                            }
                            disabled={batchSaving}
                            className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-60"
                          >
                            {activeBatch.status === "LOW"
                              ? "Mark Available"
                              : "Mark Low"}
                          </button>

                          <button
                            type="button"
                            onClick={() => updateBatch("CLOSE")}
                            disabled={batchSaving}
                            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            {batchSaving ? "Working..." : "Close / Finish Batch"}
                          </button>
                        </div>

                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          Profit remains pending while the batch is open. Closing the batch finalizes revenue − purchase cost and updates the batch sale profit records.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Container type">
                          <select
                            value={batchContainerType}
                            onChange={(event) =>
                              setBatchContainerType(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                          >
                            <option value="Basket">Basket</option>
                            <option value="Crate">Crate</option>
                            <option value="Bag">Bag</option>
                            <option value="Tray">Tray</option>
                            <option value="Batch">Other Batch</option>
                          </select>
                        </Field>

                        <Field label="Total purchase cost">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={batchCost}
                            onChange={(event) => setBatchCost(event.target.value)}
                            placeholder="e.g. 18000"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                          />
                        </Field>

                        <Field label="Reference (optional)">
                          <input
                            value={batchReference}
                            onChange={(event) =>
                              setBatchReference(event.target.value)
                            }
                            placeholder="e.g. Pepper basket 24 Oct"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                          />
                        </Field>

                        <Field label="Note (optional)">
                          <input
                            value={batchNote}
                            onChange={(event) => setBatchNote(event.target.value)}
                            placeholder="Supplier or quality note"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                          />
                        </Field>
                      </div>

                      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                        Before starting a batch, set this product's count stock and weight stock to zero. Batch stock is intentionally not measured in pieces or kilograms.
                      </div>

                      <button
                        type="button"
                        onClick={startBatch}
                        disabled={batchSaving}
                        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {batchSaving ? "Starting..." : "Start New Batch"}
                      </button>
                    </div>
                  )}

                  {recentBatches.some((batch) => batch.status === "FINISHED") ? (
                    <div className="mt-5 border-t border-emerald-200 pt-4">
                      <p className="text-sm font-semibold text-slate-800">
                        Recent finished batches
                      </p>

                      <div className="mt-3 space-y-2">
                        {recentBatches
                          .filter((batch) => batch.status === "FINISHED")
                          .slice(0, 3)
                          .map((batch) => (
                            <div
                              key={batch.id}
                              className="flex flex-col gap-1 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <span>
                                {batch.containerType} • cost ₦{batch.totalCost.toLocaleString()} • sales ₦{Number(batch.closedRevenue ?? batch.revenue).toLocaleString()}
                              </span>
                              <span className={`font-semibold ${
                                Number(batch.closedProfit ?? 0) >= 0
                                  ? "text-emerald-700"
                                  : "text-red-600"
                              }`}>
                                Profit ₦{Number(batch.closedProfit ?? 0).toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                  Count, weight and batch/container inventory are separate modes. Use only the mode that matches the physical way you actually control that product's stock.
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
                    disabled={saving || batchSaving}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : "Save Flexible Setup"}
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
