"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type OwnerOption = {
  id: string;
  name: string;
};

type CategoryOption = {
  id: string;
  name: string;
};

type UnitOption = {
  id: string;
  name: string;
};

type PriceRuleInput = {
  quantity: number;
  price: number;
  active: boolean;
};

type SaleUnitInput = {
  unitId: string;
  quantityInBaseUnit: number;
  sellingPrice: number;
  isDefault: boolean;
  active: boolean;
  priceRules: PriceRuleInput[];
};

type ProductPayload = {
  name: string;
  ownerId: string;
  categoryId: string;
  unitId: string;
  stock: number;
  lowStock: number;
  active: boolean;
  saleUnits: SaleUnitInput[];
};

const initialForm: ProductPayload = {
  name: "",
  ownerId: "",
  categoryId: "",
  unitId: "",
  stock: 0,
  lowStock: 0,
  active: true,
  saleUnits: [
    {
      unitId: "",
      quantityInBaseUnit: 1,
      sellingPrice: 0,
      isDefault: true,
      active: true,
      priceRules: [],
    },
  ],
};

export default function AddProductForm() {
  const router = useRouter();

  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);

  const [form, setForm] = useState<ProductPayload>(initialForm);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  function updateField<K extends keyof ProductPayload>(
    key: K,
    value: ProductPayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSaleUnit<K extends keyof SaleUnitInput>(
    index: number,
    key: K,
    value: SaleUnitInput[K]
  ) {
    setForm((prev) => ({
      ...prev,
      saleUnits: prev.saleUnits.map((saleUnit, i) =>
        i === index ? { ...saleUnit, [key]: value } : saleUnit
      ),
    }));
  }

  function addSaleUnitRow() {
    setForm((prev) => ({
      ...prev,
      saleUnits: [
        ...prev.saleUnits,
        {
          unitId: "",
          quantityInBaseUnit: 1,
          sellingPrice: 0,
          isDefault: false,
          active: true,
          priceRules: [],
        },
      ],
    }));
  }

  function removeSaleUnitRow(index: number) {
    setForm((prev) => ({
      ...prev,
      saleUnits: prev.saleUnits.filter((_, i) => i !== index),
    }));
  }

  function addPriceRuleRow(saleUnitIndex: number) {
    setForm((prev) => ({
      ...prev,
      saleUnits: prev.saleUnits.map((saleUnit, index) =>
        index === saleUnitIndex
          ? {
              ...saleUnit,
              priceRules: [
                ...saleUnit.priceRules,
                {
                  quantity: 1,
                  price: 0,
                  active: true,
                },
              ],
            }
          : saleUnit
      ),
    }));
  }

  function updatePriceRule<K extends keyof PriceRuleInput>(
    saleUnitIndex: number,
    ruleIndex: number,
    key: K,
    value: PriceRuleInput[K]
  ) {
    setForm((prev) => ({
      ...prev,
      saleUnits: prev.saleUnits.map((saleUnit, index) =>
        index === saleUnitIndex
          ? {
              ...saleUnit,
              priceRules: saleUnit.priceRules.map((rule, i) =>
                i === ruleIndex ? { ...rule, [key]: value } : rule
              ),
            }
          : saleUnit
      ),
    }));
  }

  function removePriceRuleRow(saleUnitIndex: number, ruleIndex: number) {
    setForm((prev) => ({
      ...prev,
      saleUnits: prev.saleUnits.map((saleUnit, index) =>
        index === saleUnitIndex
          ? {
              ...saleUnit,
              priceRules: saleUnit.priceRules.filter((_, i) => i !== ruleIndex),
            }
          : saleUnit
      ),
    }));
  }

  useEffect(() => {
    if (!open) return;

    async function loadOptions() {
      setLoadingOptions(true);

      try {
        const [ownersRes, categoriesRes, unitsRes] = await Promise.all([
          fetch("/api/owners", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/units", { cache: "no-store" }),
        ]);

        if (!ownersRes.ok || !categoriesRes.ok || !unitsRes.ok) {
          throw new Error("Failed to load product options");
        }

        const [ownersData, categoriesData, unitsData] = await Promise.all([
          ownersRes.json(),
          categoriesRes.json(),
          unitsRes.json(),
        ]);

        setOwners(ownersData);
        setCategories(categoriesData);
        setUnits(unitsData);
      } catch (error) {
        console.error(error);
        alert("Failed to load owners, categories, or units");
      } finally {
        setLoadingOptions(false);
      }
    }

    loadOptions();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: ProductPayload = {
        ...form,
        saleUnits: form.saleUnits.map((saleUnit, index) => ({
          ...saleUnit,
          isDefault:
            form.saleUnits.filter((unit) => unit.isDefault).length === 0
              ? index === 0
              : saleUnit.isDefault,
          priceRules: saleUnit.priceRules
            .filter((rule) => rule.quantity > 0)
            .map((rule) => ({
              quantity: rule.quantity,
              price: rule.price,
              active: rule.active,
            })),
        })),
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to create product");
      }

      router.refresh();

      setTimeout(() => {
        setOpen(false);
        setForm(initialForm);
      }, 100);
    } catch (error) {
      console.error(error);
      alert("Failed to save product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
      >
        + Add Product
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4">
          <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Add Product</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a product with selling units and quantity price rules.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {loadingOptions ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Loading owners, categories, and units...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Product Name">
                    <input
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="Category">
                    <select
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                      value={form.categoryId}
                      onChange={(e) => updateField("categoryId", e.target.value)}
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Owner">
                    <select
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                      value={form.ownerId}
                      onChange={(e) => updateField("ownerId", e.target.value)}
                      required
                    >
                      <option value="">Select owner</option>
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Base Stock Unit">
                    <select
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                      value={form.unitId}
                      onChange={(e) => updateField("unitId", e.target.value)}
                      required
                    >
                      <option value="">Select base unit</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Base Stock Quantity">
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                      value={form.stock}
                      onChange={(e) => updateField("stock", Number(e.target.value))}
                      required
                    />
                  </Field>

                  <Field label="Low Stock Threshold">
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                      value={form.lowStock}
                      onChange={(e) =>
                        updateField("lowStock", Number(e.target.value))
                      }
                      required
                    />
                  </Field>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Selling Units
                      </h3>
                      <p className="text-sm text-slate-500">
                        Add how this product is sold, including promo price rules.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addSaleUnitRow}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      + Add Selling Unit
                    </button>
                  </div>

                  <div className="space-y-4">
                    {form.saleUnits.map((saleUnit, index) => (
                      <div key={index} className="rounded-2xl bg-slate-50 p-4">
                        <div className="grid gap-4 md:grid-cols-4">
                          <Field label="Unit">
                            <select
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                              value={saleUnit.unitId}
                              onChange={(e) =>
                                updateSaleUnit(index, "unitId", e.target.value)
                              }
                              required
                            >
                              <option value="">Select unit</option>
                              {units.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.name}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <Field label="Qty in Base Unit">
                            <input
                              type="number"
                              min="1"
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                              value={saleUnit.quantityInBaseUnit}
                              onChange={(e) =>
                                updateSaleUnit(
                                  index,
                                  "quantityInBaseUnit",
                                  Number(e.target.value)
                                )
                              }
                              required
                            />
                          </Field>

                          <Field label="Default Selling Price">
                            <input
                              type="number"
                              min="0"
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                              value={saleUnit.sellingPrice}
                              onChange={(e) =>
                                updateSaleUnit(
                                  index,
                                  "sellingPrice",
                                  Number(e.target.value)
                                )
                              }
                              required
                            />
                          </Field>

                          <div className="flex items-end gap-3">
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={saleUnit.isDefault}
                                onChange={(e) =>
                                  updateSaleUnit(
                                    index,
                                    "isDefault",
                                    e.target.checked
                                  )
                                }
                              />
                              Default
                            </label>

                            {form.saleUnits.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSaleUnitRow(index)}
                                className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                Quantity Price Rules
                              </p>
                              <p className="text-xs text-slate-500">
                                Example: 3 pieces = ₦100
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => addPriceRuleRow(index)}
                              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              + Add Rule
                            </button>
                          </div>

                          <div className="space-y-3">
                            {saleUnit.priceRules.length === 0 ? (
                              <p className="text-xs text-slate-500">No rules yet.</p>
                            ) : (
                              saleUnit.priceRules.map((rule, ruleIndex) => (
                                <div
                                  key={ruleIndex}
                                  className="grid gap-3 md:grid-cols-3"
                                >
                                  <input
                                    type="number"
                                    min="1"
                                    value={rule.quantity}
                                    onChange={(e) =>
                                      updatePriceRule(
                                        index,
                                        ruleIndex,
                                        "quantity",
                                        Number(e.target.value)
                                      )
                                    }
                                    placeholder="Quantity"
                                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                  />

                                  <input
                                    type="number"
                                    min="0"
                                    value={rule.price}
                                    onChange={(e) =>
                                      updatePriceRule(
                                        index,
                                        ruleIndex,
                                        "price",
                                        Number(e.target.value)
                                      )
                                    }
                                    placeholder="Rule price"
                                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removePriceRuleRow(index, ruleIndex)
                                    }
                                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Remove Rule
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {loading ? "Saving..." : "Save Product"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
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