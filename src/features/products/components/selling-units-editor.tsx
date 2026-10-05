"use client";

import { useId } from "react";

import type {
  ProductPriceRuleInput,
  ProductSaleUnitConfig,
} from "@/lib/product-unit-config";

type UnitOption = {
  id: string;
  name: string;
};

type Props = {
  baseUnitId: string;
  units: UnitOption[];
  value: ProductSaleUnitConfig[];
  onChange: (value: ProductSaleUnitConfig[]) => void;
};

export default function SellingUnitsEditor({
  baseUnitId,
  units,
  value,
  onChange,
}: Props) {
  const radioGroupId = useId();

  const baseUnit = units.find(
    (unit) => unit.id === baseUnitId,
  );

  if (!baseUnitId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        Select the Base Stock Unit first. The system will then
        create the required base selling unit automatically.
      </div>
    );
  }

  function updateSaleUnit(
    index: number,
    changes: Partial<ProductSaleUnitConfig>,
  ) {
    onChange(
      value.map((saleUnit, i) =>
        i === index
          ? {
              ...saleUnit,
              ...changes,
            }
          : saleUnit,
      ),
    );
  }

  function makeDefault(index: number) {
    onChange(
      value.map((saleUnit, i) => ({
        ...saleUnit,
        isDefault: i === index,
      })),
    );
  }

  function addSellingUnit() {
    onChange([
      ...value,
      {
        unitId: "",
        quantityInBaseUnit: 1,
        sellingPrice: 0,
        isDefault: false,
        active: true,
        priceRules: [],
      },
    ]);
  }

  function removeSellingUnit(index: number) {
    if (index === 0) {
      return;
    }

    const removingDefault = value[index]?.isDefault;

    let next = value.filter((_, i) => i !== index);

    if (removingDefault && next.length > 0) {
      next = next.map((unit, i) => ({
        ...unit,
        isDefault: i === 0,
      }));
    }

    onChange(next);
  }

  function addPriceRule(saleUnitIndex: number) {
    const currentRules =
      value[saleUnitIndex].priceRules ?? [];

    updateSaleUnit(saleUnitIndex, {
      priceRules: [
        ...currentRules,
        {
          quantity: 2,
          price: 0,
          active: true,
        },
      ],
    });
  }

  function updatePriceRule(
    saleUnitIndex: number,
    ruleIndex: number,
    changes: Partial<ProductPriceRuleInput>,
  ) {
    const currentRules =
      value[saleUnitIndex].priceRules ?? [];

    updateSaleUnit(saleUnitIndex, {
      priceRules: currentRules.map((rule, i) =>
        i === ruleIndex
          ? {
              ...rule,
              ...changes,
            }
          : rule,
      ),
    });
  }

  function removePriceRule(
    saleUnitIndex: number,
    ruleIndex: number,
  ) {
    const currentRules =
      value[saleUnitIndex].priceRules ?? [];

    updateSaleUnit(saleUnitIndex, {
      priceRules: currentRules.filter(
        (_, i) => i !== ruleIndex,
      ),
    });
  }

  const selectedUnitIds = new Set(
    value
      .map((saleUnit) => saleUnit.unitId)
      .filter(Boolean),
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-semibold text-emerald-900">
          Base unit: {baseUnit?.name ?? "Unknown"}
        </p>

        <p className="mt-1 text-sm leading-6 text-emerald-800">
          Stock is always stored in this unit. The base selling
          unit always represents exactly 1 {baseUnit?.name}.
        </p>
      </div>

      {value.map((saleUnit, index) => {
        const isBaseRow = index === 0;

        const selectedUnit = units.find(
          (unit) => unit.id === saleUnit.unitId,
        );

        const priceRules = saleUnit.priceRules ?? [];

        return (
          <div
            key={saleUnit.id ?? `new-${index}`}
            className={`rounded-2xl border p-4 ${
              isBaseRow
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  {isBaseRow
                    ? "Base Selling Unit"
                    : `Additional Selling Unit ${index}`}
                </p>

                {isBaseRow ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Required. Cannot be removed or converted to
                    another quantity.
                  </p>
                ) : null}
              </div>

              {!isBaseRow ? (
                <button
                  type="button"
                  onClick={() => removeSellingUnit(index)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Remove Unit
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Selling Unit">
                {isBaseRow ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-800">
                    {baseUnit?.name}
                  </div>
                ) : (
                  <select
                    value={saleUnit.unitId}
                    onChange={(event) =>
                      updateSaleUnit(index, {
                        unitId: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                  >
                    <option value="">
                      Select selling unit
                    </option>

                    {units.map((unit) => {
                      const usedByAnotherRow =
                        selectedUnitIds.has(unit.id) &&
                        unit.id !== saleUnit.unitId;

                      const unavailable =
                        unit.id === baseUnitId ||
                        usedByAnotherRow;

                      return (
                        <option
                          key={unit.id}
                          value={unit.id}
                          disabled={unavailable}
                        >
                          {unit.name}
                          {unit.id === baseUnitId
                            ? " (Base unit)"
                            : usedByAnotherRow
                              ? " (Already used)"
                              : ""}
                        </option>
                      );
                    })}
                  </select>
                )}
              </Field>

              <Field label="Quantity in Base Unit">
                <input
                  type="number"
                  min="1"
                  step="1"
                  disabled={isBaseRow}
                  value={
                    isBaseRow
                      ? 1
                      : saleUnit.quantityInBaseUnit
                  }
                  onChange={(event) =>
                    updateSaleUnit(index, {
                      quantityInBaseUnit: Number(
                        event.target.value,
                      ),
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 disabled:bg-slate-100"
                />
              </Field>

              <Field label="Selling Price">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={saleUnit.sellingPrice}
                  onChange={(event) =>
                    updateSaleUnit(index, {
                      sellingPrice: Number(
                        event.target.value,
                      ),
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                />
              </Field>
            </div>

            {isBaseRow ? (
              <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-600">
                1 {baseUnit?.name} = 1 {baseUnit?.name}
              </div>
            ) : selectedUnit &&
              Number.isInteger(
                saleUnit.quantityInBaseUnit,
              ) &&
              saleUnit.quantityInBaseUnit > 0 ? (
              <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-700">
                <span className="font-semibold">
                  Conversion:
                </span>{" "}
                1 {selectedUnit.name} ={" "}
                {saleUnit.quantityInBaseUnit}{" "}
                {baseUnit?.name}
              </div>
            ) : null}

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <input
                type="radio"
                name={`default-selling-unit-${radioGroupId}`}
                checked={saleUnit.isDefault}
                onChange={() => makeDefault(index)}
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Default selling unit
                </span>

                <span className="block text-xs text-slate-500">
                  This is the unit selected first when selling
                  this product.
                </span>
              </span>
            </label>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Quantity Price Rules
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Optional multi-buy pricing for this selling
                    unit.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => addPriceRule(index)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  + Add Price Rule
                </button>
              </div>

              {priceRules.length === 0 ? (
                <p className="mt-3 text-xs text-slate-400">
                  No price rules.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {priceRules.map((rule, ruleIndex) => (
                    <div
                      key={ruleIndex}
                      className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Buy Quantity
                        </label>

                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={rule.quantity}
                          onChange={(event) =>
                            updatePriceRule(
                              index,
                              ruleIndex,
                              {
                                quantity: Number(
                                  event.target.value,
                                ),
                              },
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Total Price
                        </label>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={rule.price}
                          onChange={(event) =>
                            updatePriceRule(
                              index,
                              ruleIndex,
                              {
                                price: Number(
                                  event.target.value,
                                ),
                              },
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() =>
                            removePriceRule(
                              index,
                              ruleIndex,
                            )
                          }
                          className="rounded-xl border border-red-200 px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addSellingUnit}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        + Add Another Selling Unit
      </button>
    </div>
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