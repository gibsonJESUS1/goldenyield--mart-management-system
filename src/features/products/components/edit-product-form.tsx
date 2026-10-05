"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import SellingUnitsEditor from "@/features/products/components/selling-units-editor";

import {
  createBaseSaleUnit,
  prepareSaleUnitsForEditor,
  validateProductUnitConfiguration,
  type ProductSaleUnitConfig,
} from "@/lib/product-unit-config";

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

type ProductPayload = {
  id: string;
  name: string;
  ownerId: string;
  categoryId: string;
  unitId: string;
  stock: number;
  lowStock: number;
  active: boolean;
  saleUnits: ProductSaleUnitConfig[];
};

type EditProductFormProps = {
  productId: string;
};

type ProductApiResponse = {
  id: string;
  name: string;
  ownerId: string;
  categoryId: string;
  unitId: string;
  stock: number;
  lowStock: number;
  active: boolean;

  saleUnits: Array<{
    id: string;
    unitId: string;
    quantityInBaseUnit: number;
    sellingPrice: number;
    isDefault: boolean;
    active: boolean;

    priceRules?: Array<{
      id?: string;
      quantity: number;
      price: number;
      active: boolean;
    }>;
  }>;
};

export default function EditProductForm({
  productId,
}: EditProductFormProps) {
  const router = useRouter();

  const [owners, setOwners] = useState<
    OwnerOption[]
  >([]);

  const [categories, setCategories] =
    useState<CategoryOption[]>([]);

  const [units, setUnits] = useState<
    UnitOption[]
  >([]);

  const [form, setForm] =
    useState<ProductPayload | null>(
      null,
    );

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    loadingOptions,
    setLoadingOptions,
  ] = useState(false);

  const [formError, setFormError] =
    useState("");

  function updateField<
    K extends keyof ProductPayload,
  >(
    key: K,
    value: ProductPayload[K],
  ) {
    if (!form) {
      return;
    }

    setForm({
      ...form,
      [key]: value,
    });
  }

  function handleBaseUnitChange(
    newBaseUnitId: string,
  ) {
    if (!form) {
      return;
    }

    if (
      !newBaseUnitId ||
      newBaseUnitId === form.unitId
    ) {
      return;
    }

    if (form.stock !== 0) {
      alert(
        `This product currently has ${form.stock} base units in stock. Set/recount the stock to 0 before changing its base stock unit.`,
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Changing the base stock unit will reset the selling-unit configuration because all conversions depend on the base unit. Historical sales will remain unchanged. Continue?",
      );

    if (!confirmed) {
      return;
    }

    setForm({
      ...form,

      unitId: newBaseUnitId,

      saleUnits: [
        createBaseSaleUnit(
          newBaseUnitId,
        ),
      ],
    });

    setFormError("");
  }

  const validationError =
    useMemo(() => {
      if (!form) {
        return "";
      }

      if (!form.name.trim()) {
        return "Product name is required.";
      }

      if (!form.ownerId) {
        return "Owner is required.";
      }

      if (!form.categoryId) {
        return "Category is required.";
      }

      if (!form.unitId) {
        return "Base stock unit is required.";
      }

      if (
        !Number.isInteger(form.stock) ||
        form.stock < 0
      ) {
        return "Base stock quantity must be 0 or more.";
      }

      if (
        !Number.isInteger(
          form.lowStock,
        ) ||
        form.lowStock < 0
      ) {
        return "Low stock threshold must be 0 or more.";
      }

      const unitError =
        validateProductUnitConfiguration(
          form.unitId,
          form.saleUnits,
        );

      if (unitError) {
        return unitError;
      }

      return "";
    }, [form]);

  async function loadAll() {
    setLoadingOptions(true);
    setFormError("");

    try {
      const [
        ownersRes,
        categoriesRes,
        unitsRes,
        productRes,
      ] = await Promise.all([
        fetch("/api/owners", {
          cache: "no-store",
        }),

        fetch("/api/categories", {
          cache: "no-store",
        }),

        fetch("/api/units", {
          cache: "no-store",
        }),

        fetch(
          `/api/products/${productId}`,
          {
            cache: "no-store",
          },
        ),
      ]);

      if (
        !ownersRes.ok ||
        !categoriesRes.ok ||
        !unitsRes.ok ||
        !productRes.ok
      ) {
        throw new Error(
          "Failed to load edit form data",
        );
      }

      const [
        ownersData,
        categoriesData,
        unitsData,
        productData,
      ] = await Promise.all([
        ownersRes.json(),
        categoriesRes.json(),
        unitsRes.json(),
        productRes.json(),
      ]);

      setOwners(ownersData);

      setCategories(
        categoriesData,
      );

      setUnits(unitsData);

      const product =
        productData as ProductApiResponse;

      const editableSaleUnits =
        product.saleUnits
          .filter(
            (saleUnit) =>
              saleUnit.active !==
                false ||
              saleUnit.unitId ===
                product.unitId,
          )
          .map(
            (
              saleUnit,
            ): ProductSaleUnitConfig => ({
              id: saleUnit.id,

              unitId:
                saleUnit.unitId,

              quantityInBaseUnit:
                Number(
                  saleUnit.quantityInBaseUnit,
                ),

              sellingPrice:
                Number(
                  saleUnit.sellingPrice,
                ),

              isDefault:
                saleUnit.isDefault,

              active: true,

              priceRules:
                (
                  saleUnit.priceRules ??
                  []
                )
                  .filter(
                    (rule) =>
                      rule.active !==
                      false,
                  )
                  .map(
                    (rule) => ({
                      quantity:
                        Number(
                          rule.quantity,
                        ),

                      price:
                        Number(
                          rule.price,
                        ),

                      active: true,
                    }),
                  ),
            }),
          );

      setForm({
        id: product.id,

        name: product.name,

        ownerId:
          product.ownerId,

        categoryId:
          product.categoryId,

        unitId:
          product.unitId,

        stock: Number(
          product.stock,
        ),

        lowStock: Number(
          product.lowStock,
        ),

        active:
          product.active,

        saleUnits:
          prepareSaleUnitsForEditor(
            product.unitId,
            editableSaleUnits,
          ),
      });
    } catch (error) {
      console.error(error);

      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to load product",
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadAll();
  }, [open, productId]);

  function closeForm() {
    setOpen(false);
    setForm(null);
    setFormError("");
  }

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!form) {
      return;
    }

    if (validationError) {
      setFormError(
        validationError,
      );

      return;
    }

    setFormError("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/products/${productId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: form.name
              .trim()
              .replace(
                /\s+/g,
                " ",
              ),

            ownerId:
              form.ownerId,

            categoryId:
              form.categoryId,

            unitId:
              form.unitId,

            stock:
              form.stock,

            lowStock:
              form.lowStock,

            active:
              form.active,

            saleUnits:
              form.saleUnits,
          }),
        },
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        if (
          data?.code ===
          "DUPLICATE_ACTIVE_PRODUCT"
        ) {
          throw new Error(
            `"${data.existingProduct?.name ?? form.name}" already exists as another active product.`,
          );
        }

        if (
          data?.code ===
          "DUPLICATE_ARCHIVED_PRODUCT"
        ) {
          throw new Error(
            `"${data.existingProduct?.name ?? form.name}" already exists as another archived product.`,
          );
        }

        throw new Error(
          data?.error ||
            "Failed to update product",
        );
      }

      closeForm();

      router.refresh();
    } catch (error) {
      console.error(error);

      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to update product",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="text-sm font-medium text-emerald-600 hover:underline"
      >
        Edit
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4">
          <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Edit Product
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update product
                  details and manage
                  its base/selling-unit
                  configuration.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {formError ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            {loadingOptions ||
            !form ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Loading product...
              </div>
            ) : (
              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-6"
              >
                <section className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Product Details
                    </h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Product Name">
                      <input
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        value={
                          form.name
                        }
                        onChange={(e) =>
                          updateField(
                            "name",
                            e.target
                              .value,
                          )
                        }
                        required
                      />
                    </Field>

                    <Field label="Category">
                      <select
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        value={
                          form.categoryId
                        }
                        onChange={(e) =>
                          updateField(
                            "categoryId",
                            e.target
                              .value,
                          )
                        }
                        required
                      >
                        <option value="">
                          Select category
                        </option>

                        {categories.map(
                          (
                            category,
                          ) => (
                            <option
                              key={
                                category.id
                              }
                              value={
                                category.id
                              }
                            >
                              {
                                category.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </Field>

                    <Field label="Owner">
                      <select
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        value={
                          form.ownerId
                        }
                        onChange={(e) =>
                          updateField(
                            "ownerId",
                            e.target
                              .value,
                          )
                        }
                        required
                      >
                        <option value="">
                          Select owner
                        </option>

                        {owners.map(
                          (owner) => (
                            <option
                              key={
                                owner.id
                              }
                              value={
                                owner.id
                              }
                            >
                              {
                                owner.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </Field>

                    <Field label="Base Stock Unit">
                      <select
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        value={
                          form.unitId
                        }
                        onChange={(e) =>
                          handleBaseUnitChange(
                            e.target
                              .value,
                          )
                        }
                        required
                      >
                        <option value="">
                          Select base unit
                        </option>

                        {units.map(
                          (unit) => (
                            <option
                              key={
                                unit.id
                              }
                              value={
                                unit.id
                              }
                            >
                              {
                                unit.name
                              }
                            </option>
                          ),
                        )}
                      </select>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Changing the
                        base unit
                        changes the
                        meaning of every
                        selling-unit
                        conversion, so
                        it is only
                        allowed when
                        stock is zero.
                      </p>
                    </Field>

                    <Field label="Base Stock Quantity">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        value={
                          form.stock
                        }
                        onChange={(e) =>
                          updateField(
                            "stock",
                            Number(
                              e.target
                                .value,
                            ),
                          )
                        }
                        required
                      />
                    </Field>

                    <Field label="Low Stock Threshold">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        value={
                          form.lowStock
                        }
                        onChange={(e) =>
                          updateField(
                            "lowStock",
                            Number(
                              e.target
                                .value,
                            ),
                          )
                        }
                        required
                      />
                    </Field>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Selling Units
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Every conversion
                      is measured
                      against the base
                      stock unit.
                    </p>
                  </div>

                  <SellingUnitsEditor
                    baseUnitId={
                      form.unitId
                    }
                    units={units}
                    value={
                      form.saleUnits
                    }
                    onChange={(
                      saleUnits,
                    ) =>
                      updateField(
                        "saleUnits",
                        saleUnits,
                      )
                    }
                  />
                </section>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
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