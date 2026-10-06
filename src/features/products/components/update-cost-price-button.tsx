"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PriceRule = {
  quantity: number;
  price: number;
  active?: boolean;
};

type SaleUnit = {
  id: string;
  unitName: string;
  quantityInBaseUnit: number;
  sellingPrice: number;
  isDefault: boolean;
  active: boolean;
  priceRules: PriceRule[];
};

type UpdateCostPriceButtonProps = {
  productId: string;
  productName: string;
  baseUnitName: string;
  currentCostPrice?: number;
  saleUnits: SaleUnit[];
};

function formatMoney(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function UpdateCostPriceButton({
  productId,
  productName,
  baseUnitName,
  currentCostPrice = 0,
  saleUnits,
}: UpdateCostPriceButtonProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [costPrice, setCostPrice] = useState(
    currentCostPrice > 0 ? String(currentCostPrice) : "",
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedCostPrice = Number(costPrice);

  const activeSaleUnits = useMemo(
    () => saleUnits.filter((unit) => unit.active !== false),
    [saleUnits],
  );

  const baseSaleUnit = useMemo(
    () =>
      activeSaleUnits.find(
        (unit) => unit.quantityInBaseUnit === 1,
      ) ?? null,
    [activeSaleUnits],
  );

  const impactRows = useMemo(() => {
    if (
      !Number.isFinite(parsedCostPrice) ||
      parsedCostPrice <= 0
    ) {
      return [];
    }

    const baseRetailPrice =
      baseSaleUnit?.sellingPrice ?? 0;

    return activeSaleUnits.map((saleUnit) => {
      const actualCost =
        parsedCostPrice *
        saleUnit.quantityInBaseUnit;

      const profit =
        saleUnit.sellingPrice -
        actualCost;

      const margin =
        saleUnit.sellingPrice > 0
          ? (profit /
              saleUnit.sellingPrice) *
            100
          : 0;

      const effectivePricePerBaseUnit =
        saleUnit.quantityInBaseUnit > 0
          ? saleUnit.sellingPrice /
            saleUnit.quantityInBaseUnit
          : 0;

      const normalIndividualRetail =
        baseRetailPrice > 0
          ? baseRetailPrice *
            saleUnit.quantityInBaseUnit
          : 0;

      const customerSavings =
        normalIndividualRetail > 0
          ? normalIndividualRetail -
            saleUnit.sellingPrice
          : 0;

      const priceRules =
        (saleUnit.priceRules ?? [])
          .filter(
            (rule) =>
              rule.active !== false,
          )
          .map((rule) => {
            const totalBaseUnits =
              rule.quantity *
              saleUnit.quantityInBaseUnit;

            const ruleCost =
              parsedCostPrice *
              totalBaseUnits;

            const ruleProfit =
              rule.price -
              ruleCost;

            const ruleMargin =
              rule.price > 0
                ? (ruleProfit /
                    rule.price) *
                  100
                : 0;

            return {
              quantity:
                rule.quantity,
              price:
                rule.price,
              cost:
                ruleCost,
              profit:
                ruleProfit,
              margin:
                ruleMargin,
            };
          });

      return {
        id: saleUnit.id,
        unitName:
          saleUnit.unitName,
        quantityInBaseUnit:
          saleUnit.quantityInBaseUnit,
        sellingPrice:
          saleUnit.sellingPrice,
        actualCost,
        profit,
        margin,
        effectivePricePerBaseUnit,
        normalIndividualRetail,
        customerSavings,
        priceRules,
      };
    });
  }, [
    parsedCostPrice,
    activeSaleUnits,
    baseSaleUnit,
  ]);

  const lossCount = useMemo(() => {
    return impactRows.reduce(
      (count, row) => {
        const unitLoss =
          row.profit < 0 ? 1 : 0;

        const ruleLosses =
          row.priceRules.filter(
            (rule) =>
              rule.profit < 0,
          ).length;

        return (
          count +
          unitLoss +
          ruleLosses
        );
      },
      0,
    );
  }, [impactRows]);

  const costDifference =
    parsedCostPrice > 0
      ? parsedCostPrice -
        currentCostPrice
      : 0;

  async function handleSubmit() {
    if (
      !Number.isFinite(
        parsedCostPrice,
      ) ||
      parsedCostPrice <= 0
    ) {
      alert(
        "Enter a valid cost price.",
      );

      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/products/update-cost",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              productId,
              costPrice:
                parsedCostPrice,
              note:
                note.trim() ||
                null,
            }),
          },
        );

      const data =
        (await response.json()) as {
          message?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update cost price",
        );
      }

      setOpen(false);
      setNote("");

      router.refresh();

      if (lossCount > 0) {
        alert(
          `Cost price updated successfully. ${lossCount} selling price${
            lossCount === 1
              ? ""
              : "s"
          } now need attention because they are below cost.`,
        );
      } else {
        alert(
          "Cost price updated successfully.",
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update cost price",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (saving) {
      return;
    }

    setOpen(false);

    setCostPrice(
      currentCostPrice > 0
        ? String(
            currentCostPrice,
          )
        : "",
    );

    setNote("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        Update Cost
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4">
          <div className="mx-auto my-4 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Update Cost Price
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {productName}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Cost is stored per{" "}
                  {baseUnitName}.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleClose
                }
                disabled={saving}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Current Cost /{" "}
                  {baseUnitName}
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatMoney(
                    currentCostPrice,
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  New Cost /{" "}
                  {baseUnitName}
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {parsedCostPrice > 0
                    ? formatMoney(
                        parsedCostPrice,
                      )
                    : "—"}
                </p>

                {parsedCostPrice > 0 &&
                currentCostPrice > 0 ? (
                  <p
                    className={`mt-1 text-xs font-medium ${
                      costDifference > 0
                        ? "text-amber-700"
                        : costDifference < 0
                          ? "text-emerald-700"
                          : "text-slate-500"
                    }`}
                  >
                    {costDifference > 0
                      ? `Increase of ${formatMoney(
                          costDifference,
                        )}`
                      : costDifference < 0
                        ? `Decrease of ${formatMoney(
                            Math.abs(
                              costDifference,
                            ),
                          )}`
                        : "No change"}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  New Cost Price per{" "}
                  {baseUnitName}
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  value={
                    costPrice
                  }
                  onChange={(e) =>
                    setCostPrice(
                      e.target
                        .value,
                    )
                  }
                  placeholder={`Cost of one ${baseUnitName}`}
                />
              </label>

              {impactRows.length >
              0 ? (
                <section className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-900">
                      Selling Price
                      Impact
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      This shows what
                      happens to your
                      current selling
                      prices if the new
                      cost is saved.
                      Bulk discounts are
                      fine as long as
                      they remain above
                      actual cost.
                    </p>
                  </div>

                  {lossCount > 0 ? (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="font-semibold text-red-800">
                        ⚠ Pricing
                        attention required
                      </p>

                      <p className="mt-1 text-sm leading-6 text-red-700">
                        {lossCount} current
                        selling price
                        {lossCount === 1
                          ? ""
                          : "s"}{" "}
                        would be below the
                        new cost. The real
                        cost should still
                        be saved, but those
                        selling prices
                        should be increased
                        before further
                        sales.
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-semibold text-emerald-800">
                        All current prices
                        remain profitable
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {impactRows.map(
                      (row) => {
                        const profitable =
                          row.profit >=
                          0;

                        const isBulk =
                          row.quantityInBaseUnit >
                          1;

                        return (
                          <div
                            key={
                              row.id
                            }
                            className={`rounded-xl border p-4 ${
                              profitable
                                ? "border-slate-200 bg-slate-50"
                                : "border-red-200 bg-red-50"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-slate-900">
                                  {
                                    row.unitName
                                  }
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  1{" "}
                                  {
                                    row.unitName
                                  }{" "}
                                  ={" "}
                                  {
                                    row.quantityInBaseUnit
                                  }{" "}
                                  {
                                    baseUnitName
                                  }
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  profitable
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {profitable
                                  ? "Profitable"
                                  : "Below Cost"}
                              </span>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              <Metric
                                label="New Actual Cost"
                                value={formatMoney(
                                  row.actualCost,
                                )}
                              />

                              <Metric
                                label="Selling Price"
                                value={formatMoney(
                                  row.sellingPrice,
                                )}
                              />

                              <Metric
                                label={
                                  profitable
                                    ? "Profit"
                                    : "Loss"
                                }
                                value={formatMoney(
                                  Math.abs(
                                    row.profit,
                                  ),
                                )}
                              />

                              <Metric
                                label="Margin"
                                value={`${row.margin.toFixed(
                                  1,
                                )}%`}
                              />
                            </div>

                            {isBulk ? (
                              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                <Metric
                                  label={`Effective / ${baseUnitName}`}
                                  value={formatMoney(
                                    row.effectivePricePerBaseUnit,
                                  )}
                                />

                                <Metric
                                  label="Individual Retail Value"
                                  value={
                                    row.normalIndividualRetail >
                                    0
                                      ? formatMoney(
                                          row.normalIndividualRetail,
                                        )
                                      : "—"
                                  }
                                />

                                <Metric
                                  label="Customer Saves"
                                  value={
                                    row.customerSavings >
                                    0
                                      ? formatMoney(
                                          row.customerSavings,
                                        )
                                      : "—"
                                  }
                                />
                              </div>
                            ) : null}

                            {row.priceRules
                              .length >
                            0 ? (
                              <div className="mt-4 border-t border-slate-200 pt-3">
                                <p className="mb-2 text-sm font-semibold text-slate-800">
                                  Quantity
                                  Deals
                                </p>

                                <div className="space-y-2">
                                  {row.priceRules.map(
                                    (
                                      rule,
                                      index,
                                    ) => {
                                      const ruleProfitable =
                                        rule.profit >=
                                        0;

                                      return (
                                        <div
                                          key={
                                            index
                                          }
                                          className={`rounded-lg border p-3 text-sm ${
                                            ruleProfitable
                                              ? "border-slate-200 bg-white"
                                              : "border-red-200 bg-red-100/40"
                                          }`}
                                        >
                                          <div className="flex flex-wrap justify-between gap-2">
                                            <span className="font-medium text-slate-800">
                                              {
                                                rule.quantity
                                              }{" "}
                                              ×{" "}
                                              {
                                                row.unitName
                                              }{" "}
                                              ={" "}
                                              {formatMoney(
                                                rule.price,
                                              )}
                                            </span>

                                            <span
                                              className={
                                                ruleProfitable
                                                  ? "font-semibold text-emerald-700"
                                                  : "font-semibold text-red-700"
                                              }
                                            >
                                              {ruleProfitable
                                                ? `Profit ${formatMoney(
                                                    rule.profit,
                                                  )}`
                                                : `Loss ${formatMoney(
                                                    Math.abs(
                                                      rule.profit,
                                                    ),
                                                  )}`}
                                            </span>
                                          </div>

                                          <p className="mt-1 text-xs text-slate-500">
                                            Cost{" "}
                                            {formatMoney(
                                              rule.cost,
                                            )}{" "}
                                            · Margin{" "}
                                            {rule.margin.toFixed(
                                              1,
                                            )}
                                            %
                                          </p>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Note (Optional)
                </span>

                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  value={note}
                  onChange={(e) =>
                    setNote(
                      e.target
                        .value,
                    )
                  }
                  placeholder="Example: supplier price increased"
                />
              </label>

              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                Cost price should always
                reflect what the stock
                actually costs. If the
                new cost makes a selling
                price unprofitable, save
                the correct cost first
                and then adjust the
                selling price.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={
                    handleClose
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSubmit
                  }
                  disabled={
                    saving ||
                    !Number.isFinite(
                      parsedCostPrice,
                    ) ||
                    parsedCostPrice <=
                      0
                  }
                  className={`rounded-xl px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                    lossCount > 0
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {saving
                    ? "Saving..."
                    : lossCount > 0
                      ? "Save Real Cost"
                      : "Save Cost Price"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}