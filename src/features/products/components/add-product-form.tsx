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

type ExistingProduct = {
  id: string;
  name: string;
  active: boolean;
};

type ProductPayload = {
  name: string;
  ownerId: string;
  categoryId: string;
  unitId: string;
  stock: number;
  lowStock: number;
  active: boolean;
  saleUnits: ProductSaleUnitConfig[];
};

function createInitialForm(): ProductPayload {
  return {
    name: "",
    ownerId: "",
    categoryId: "",
    unitId: "",
    stock: 0,
    lowStock: 0,
    active: true,
    saleUnits: [],
  };
}

function normalizeProductName(name: string) {
  return name
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export default function AddProductForm() {
  const router = useRouter();

  const [owners, setOwners] = useState<
    OwnerOption[]
  >([]);

  const [categories, setCategories] =
    useState<CategoryOption[]>([]);

  const [units, setUnits] = useState<
    UnitOption[]
  >([]);

  const [
    existingProducts,
    setExistingProducts,
  ] = useState<ExistingProduct[]>([]);

  const [form, setForm] =
    useState<ProductPayload>(
      createInitialForm,
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
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleBaseUnitChange(
    newBaseUnitId: string,
  ) {
    if (
      newBaseUnitId === form.unitId
    ) {
      return;
    }

    if (!newBaseUnitId) {
      setForm((prev) => ({
        ...prev,
        unitId: "",
        saleUnits: [],
      }));

      return;
    }

    if (form.unitId) {
      const hasConfiguredSellingUnits =
        form.saleUnits.length > 1 ||
        form.saleUnits.some(
          (saleUnit) =>
            saleUnit.sellingPrice > 0 ||
            (saleUnit.priceRules?.length ??
              0) > 0,
        );

      if (hasConfiguredSellingUnits) {
        const confirmed =
          window.confirm(
            "Changing the base stock unit will reset the selling-unit setup because all conversions depend on the base unit. Continue?",
          );

        if (!confirmed) {
          return;
        }
      }
    }

    setForm((prev) => ({
      ...prev,

      unitId: newBaseUnitId,

      saleUnits: [
        createBaseSaleUnit(
          newBaseUnitId,
        ),
      ],
    }));

    setFormError("");
  }

  const duplicateProduct =
    useMemo(() => {
      const normalizedName =
        normalizeProductName(
          form.name,
        );

      if (!normalizedName) {
        return null;
      }

      return (
        existingProducts.find(
          (product) =>
            normalizeProductName(
              product.name,
            ) === normalizedName,
        ) ?? null
      );
    }, [
      form.name,
      existingProducts,
    ]);

  const validationError =
    useMemo(() => {
      if (!form.name.trim()) {
        return "Product name is required.";
      }

      if (duplicateProduct) {
        return duplicateProduct.active
          ? `"${duplicateProduct.name}" already exists as an active product.`
          : `"${duplicateProduct.name}" already exists in Archived Products. Restore it instead of creating another copy.`;
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
    }, [
      form,
      duplicateProduct,
    ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    async function loadOptions() {
      setLoadingOptions(true);

      try {
        const [
          ownersRes,
          categoriesRes,
          unitsRes,
          productsRes,
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

          fetch("/api/products", {
            cache: "no-store",
          }),
        ]);

        if (
          !ownersRes.ok ||
          !categoriesRes.ok ||
          !unitsRes.ok ||
          !productsRes.ok
        ) {
          throw new Error(
            "Failed to load product options",
          );
        }

        const [
          ownersData,
          categoriesData,
          unitsData,
          productsData,
        ] = await Promise.all([
          ownersRes.json(),
          categoriesRes.json(),
          unitsRes.json(),
          productsRes.json(),
        ]);

        setOwners(ownersData);

        setCategories(
          categoriesData,
        );

        setUnits(unitsData);

        setExistingProducts(
          (
            productsData as ExistingProduct[]
          ).map((product) => ({
            id: product.id,
            name: product.name,
            active: product.active,
          })),
        );
      } catch (error) {
        console.error(error);

        alert(
          "Failed to load owners, categories, units, or existing products",
        );
      } finally {
        setLoadingOptions(false);
      }
    }

    void loadOptions();
  }, [open]);

  function closeForm() {
    setOpen(false);
    setFormError("");
    setForm(createInitialForm());
  }

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (validationError) {
      setFormError(
        validationError,
      );

      return;
    }

    setFormError("");
    setLoading(true);

    try {
      const payload: ProductPayload = {
        ...form,

        name: form.name
          .trim()
          .replace(/\s+/g, " "),

        saleUnits:
          form.saleUnits,
      };

      const response = await fetch(
        "/api/products",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload,
          ),
        },
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        if (
          data?.code ===
          "DUPLICATE_ARCHIVED_PRODUCT"
        ) {
          throw new Error(
            `"${data.existingProduct?.name ?? form.name}" already exists in Archived Products. Restore that product instead.`,
          );
        }

        if (
          data?.code ===
          "DUPLICATE_ACTIVE_PRODUCT"
        ) {
          throw new Error(
            `"${data.existingProduct?.name ?? form.name}" already exists as an active product.`,
          );
        }

        throw new Error(
          data?.error ||
            "Failed to create product",
        );
      }

      setForm(createInitialForm());
      setFormError("");
      setOpen(false);

      router.refresh();
    } catch (error) {
      console.error(error);

      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to save product",
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
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
      >
        + Add Product
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4">
          <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Add Product
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a product using
                  a clear base stock unit
                  and selling-unit
                  conversions.
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

            {loadingOptions ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Loading owners,
                categories, units and
                existing products...
              </div>
            ) : (
              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-6"
              >
                {duplicateProduct ? (
                  <div
                    className={`rounded-2xl border px-4 py-4 text-sm ${
                      duplicateProduct.active
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    <p className="font-semibold">
                      Product already
                      exists
                    </p>

                    <p className="mt-1">
                      {duplicateProduct.active
                        ? `"${duplicateProduct.name}" is already an active product.`
                        : `"${duplicateProduct.name}" is archived. Do not create another copy. Restore the existing product instead.`}
                    </p>
                  </div>
                ) : null}

                {formError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                ) : null}

                <section className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Product Details
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Start with the
                      product and the
                      smallest unit you
                      use to count its
                      stock.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Product Name">
                      <input
                        className={`w-full rounded-xl border px-4 py-3 outline-none ${
                          duplicateProduct
                            ? "border-red-300 focus:border-red-500"
                            : "border-slate-300 focus:border-emerald-500"
                        }`}
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
                        Choose the
                        smallest unit
                        you normally
                        count in
                        inventory.
                        Example:
                        Piece, Sachet
                        or Bottle.
                      </p>
                    </Field>

                    <Field label="Opening Stock">
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

                      <p className="mt-2 text-xs text-slate-500">
                        Enter this in
                        the selected
                        base stock
                        unit.
                      </p>
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
                      The base selling
                      unit is created
                      automatically.
                      Add larger units
                      by specifying how
                      many base units
                      they contain.
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
                    disabled={
                      loading ||
                      Boolean(
                        duplicateProduct,
                      )
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "Saving..."
                      : duplicateProduct
                        ? "Product Already Exists"
                        : "Save Product"}
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