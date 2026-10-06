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

import {
  getPricingWarnings,
} from "@/lib/product-pricing";

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
  currentCostPrice: number | null;
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
    currentCostPrice: null,
    active: true,
    saleUnits: [],
  };
}

function normalizeProductName(
  name: string,
) {
  return name
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function formatMoney(
  value: number,
) {
  return `₦${value.toLocaleString(
    "en-NG",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  )}`;
}

export default function AddProductForm() {
  const router = useRouter();

  const [owners, setOwners] =
    useState<OwnerOption[]>([]);

  const [
    categories,
    setCategories,
  ] = useState<CategoryOption[]>([]);

  const [units, setUnits] =
    useState<UnitOption[]>([]);

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

  const [
    formError,
    setFormError,
  ] = useState("");

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

  const baseUnit =
    useMemo(
      () =>
        units.find(
          (unit) =>
            unit.id ===
            form.unitId,
        ) ?? null,
      [
        units,
        form.unitId,
      ],
    );

  const baseSaleUnit =
    useMemo(() => {
      return (
        form.saleUnits.find(
          (saleUnit) =>
            saleUnit.unitId ===
            form.unitId,
        ) ?? null
      );
    }, [
      form.saleUnits,
      form.unitId,
    ]);

  function handleBaseUnitChange(
    newBaseUnitId: string,
  ) {
    if (
      newBaseUnitId ===
      form.unitId
    ) {
      return;
    }

    if (!newBaseUnitId) {
      setForm((prev) => ({
        ...prev,
        unitId: "",
        currentCostPrice: null,
        saleUnits: [],
      }));

      return;
    }

    if (form.unitId) {
      const hasConfiguredData =
        form.saleUnits.length > 1 ||
        form.saleUnits.some(
          (saleUnit) =>
            saleUnit.sellingPrice > 0 ||
            (
              saleUnit.priceRules ??
              []
            ).length > 0,
        ) ||
        form.currentCostPrice != null;

      if (hasConfiguredData) {
        const confirmed =
          window.confirm(
            "Changing the base stock unit will reset the selling-unit setup and cost price because both depend on the base unit. Continue?",
          );

        if (!confirmed) {
          return;
        }
      }
    }

    setForm((prev) => ({
      ...prev,

      unitId:
        newBaseUnitId,

      currentCostPrice:
        null,

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
            ) ===
            normalizedName,
        ) ?? null
      );
    }, [
      form.name,
      existingProducts,
    ]);

  const pricingWarnings =
    useMemo(() => {
      return getPricingWarnings(
        form.currentCostPrice,
        form.saleUnits,
      );
    }, [
      form.currentCostPrice,
      form.saleUnits,
    ]);

  const profitabilityRows =
    useMemo(() => {
      if (
        form.currentCostPrice ==
          null ||
        form.currentCostPrice <=
          0
      ) {
        return [];
      }

      const baseSellingPrice =
        baseSaleUnit?.sellingPrice ??
        0;

      return form.saleUnits
        .filter(
          (saleUnit) =>
            saleUnit.active !== false,
        )
        .map((saleUnit) => {
          const unit =
            units.find(
              (item) =>
                item.id ===
                saleUnit.unitId,
            );

          const quantityInBaseUnit =
            saleUnit.quantityInBaseUnit;

          const totalCost =
            form.currentCostPrice! *
            quantityInBaseUnit;

          const sellingPrice =
            saleUnit.sellingPrice;

          const profit =
            sellingPrice -
            totalCost;

          const margin =
            sellingPrice > 0
              ? (profit /
                  sellingPrice) *
                100
              : 0;

          const effectivePricePerBaseUnit =
            quantityInBaseUnit > 0
              ? sellingPrice /
                quantityInBaseUnit
              : 0;

          /*
           * What the customer would pay
           * if they bought the same number
           * of base units individually.
           */
          const normalRetailValue =
            baseSellingPrice > 0
              ? baseSellingPrice *
                quantityInBaseUnit
              : 0;

          const customerSavings =
            normalRetailValue > 0
              ? normalRetailValue -
                sellingPrice
              : 0;

          const discountPercent =
            normalRetailValue > 0 &&
            customerSavings > 0
              ? (customerSavings /
                  normalRetailValue) *
                100
              : 0;

          const priceRules =
            (
              saleUnit.priceRules ??
              []
            )
              .filter(
                (rule) =>
                  rule.active !==
                  false,
              )
              .map((rule) => {
                const totalBaseUnits =
                  quantityInBaseUnit *
                  rule.quantity;

                const cost =
                  form.currentCostPrice! *
                  totalBaseUnits;

                const normalRetail =
                  baseSellingPrice > 0
                    ? baseSellingPrice *
                      totalBaseUnits
                    : 0;

                const ruleProfit =
                  rule.price -
                  cost;

                const savings =
                  normalRetail > 0
                    ? normalRetail -
                      rule.price
                    : 0;

                const effectivePrice =
                  totalBaseUnits > 0
                    ? rule.price /
                      totalBaseUnits
                    : 0;

                const margin =
                  rule.price > 0
                    ? (ruleProfit /
                        rule.price) *
                      100
                    : 0;

                return {
                  quantity:
                    rule.quantity,

                  totalBaseUnits,

                  price:
                    rule.price,

                  cost,

                  profit:
                    ruleProfit,

                  savings,

                  effectivePrice,

                  margin,
                };
              });

          return {
            unitId:
              saleUnit.unitId,

            unitName:
              unit?.name ??
              "Selling Unit",

            quantityInBaseUnit,

            totalCost,

            sellingPrice,

            profit,

            margin,

            effectivePricePerBaseUnit,

            normalRetailValue,

            customerSavings,

            discountPercent,

            priceRules,
          };
        });
    }, [
      form.currentCostPrice,
      form.saleUnits,
      units,
      baseSaleUnit,
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
        !Number.isInteger(
          form.stock,
        ) ||
        form.stock < 0
      ) {
        return "Opening stock must be 0 or more.";
      }

      if (
        !Number.isInteger(
          form.lowStock,
        ) ||
        form.lowStock < 0
      ) {
        return "Low stock threshold must be 0 or more.";
      }

      if (
        form.currentCostPrice !=
          null &&
        (!Number.isFinite(
          form.currentCostPrice,
        ) ||
          form.currentCostPrice <=
            0)
      ) {
        return "Cost price must be greater than zero.";
      }

      if (
        form.stock > 0 &&
        form.currentCostPrice ==
          null
      ) {
        return "Cost price is required when opening stock is greater than zero.";
      }

      const unitError =
        validateProductUnitConfiguration(
          form.unitId,
          form.saleUnits,
        );

      if (unitError) {
        return unitError;
      }

      if (
        pricingWarnings.length >
        0
      ) {
        return pricingWarnings[0]
          .message;
      }

      return "";
    }, [
      form,
      duplicateProduct,
      pricingWarnings,
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
          fetch(
            "/api/owners",
            {
              cache:
                "no-store",
            },
          ),

          fetch(
            "/api/categories",
            {
              cache:
                "no-store",
            },
          ),

          fetch(
            "/api/units",
            {
              cache:
                "no-store",
            },
          ),

          fetch(
            "/api/products",
            {
              cache:
                "no-store",
            },
          ),
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

        setOwners(
          ownersData,
        );

        setCategories(
          categoriesData,
        );

        setUnits(
          unitsData,
        );

        setExistingProducts(
          (
            productsData as ExistingProduct[]
          ).map(
            (product) => ({
              id:
                product.id,

              name:
                product.name,

              active:
                product.active,
            }),
          ),
        );
      } catch (error) {
        console.error(
          error,
        );

        alert(
          "Failed to load owners, categories, units, or existing products",
        );
      } finally {
        setLoadingOptions(
          false,
        );
      }
    }

    void loadOptions();
  }, [open]);

  function closeForm() {
    setOpen(false);

    setFormError("");

    setForm(
      createInitialForm(),
    );
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
      const payload: ProductPayload =
        {
          ...form,

          name:
            form.name
              .trim()
              .replace(
                /\s+/g,
                " ",
              ),

          saleUnits:
            form.saleUnits,
        };

      const response =
        await fetch(
          "/api/products",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => null,
          );

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

      setForm(
        createInitialForm(),
      );

      setFormError("");

      setOpen(false);

      router.refresh();
    } catch (error) {
      console.error(
        error,
      );

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
                  Set the base
                  stock unit,
                  actual cost and
                  selling units
                  correctly from
                  the start.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {loadingOptions ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Loading product
                options...
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
                        : `"${duplicateProduct.name}" is archived. Restore the existing product instead of creating another copy.`}
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
                        onChange={(
                          e,
                        ) =>
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
                        onChange={(
                          e,
                        ) =>
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
                        onChange={(
                          e,
                        ) =>
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
                          (
                            owner,
                          ) => (
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
                        onChange={(
                          e,
                        ) =>
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
                          (
                            unit,
                          ) => (
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
                        Use the smallest
                        unit you count in
                        inventory.
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
                        onChange={(
                          e,
                        ) =>
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
                        Quantity in{" "}
                        {baseUnit?.name ??
                          "the base unit"}.
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
                        onChange={(
                          e,
                        ) =>
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

                    <Field
                      label={`Cost Price per ${
                        baseUnit?.name ??
                        "Base Unit"
                      }`}
                    >
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        value={
                          form.currentCostPrice ??
                          ""
                        }
                        onChange={(
                          e,
                        ) => {
                          const value =
                            e.target
                              .value;

                          updateField(
                            "currentCostPrice",
                            value ===
                              ""
                              ? null
                              : Number(
                                  value,
                                ),
                          );
                        }}
                        placeholder="Example: 40"
                      />

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Enter the real
                        purchase cost of
                        one{" "}
                        {baseUnit?.name ??
                          "base unit"}.
                        If you buy a pack,
                        divide the pack
                        purchase price by
                        the number of base
                        units inside it.
                      </p>
                    </Field>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Selling Units
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Define how the
                      product is sold.
                      Pack and Carton
                      prices can be
                      cheaper per piece
                      than individual
                      retail.
                    </p>
                  </div>

                  <SellingUnitsEditor
                    baseUnitId={
                      form.unitId
                    }
                    units={
                      units
                    }
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

                {form.currentCostPrice !=
                  null &&
                profitabilityRows.length >
                  0 ? (
                  <section className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">
                        Profit & Bulk
                        Price Check
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        A Pack or Carton
                        may be cheaper
                        than buying the
                        same quantity
                        individually.
                        That is a normal
                        bulk discount.
                        We only flag it
                        as a problem when
                        the selling price
                        falls below its
                        actual cost.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {profitabilityRows.map(
                        (
                          row,
                          index,
                        ) => {
                          const profitable =
                            row.profit >=
                            0;

                          const isBulk =
                            row.quantityInBaseUnit >
                            1;

                          const hasBulkDiscount =
                            isBulk &&
                            row.customerSavings >
                              0;

                          return (
                            <div
                              key={`${row.unitId}-${index}`}
                              className={`rounded-2xl border p-4 ${
                                profitable
                                  ? "border-emerald-200 bg-emerald-50"
                                  : "border-red-200 bg-red-50"
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-base font-bold text-slate-900">
                                    {
                                      row.unitName
                                    }
                                  </p>

                                  <p className="mt-1 text-sm text-slate-600">
                                    1{" "}
                                    {
                                      row.unitName
                                    }{" "}
                                    ={" "}
                                    {
                                      row.quantityInBaseUnit
                                    }{" "}
                                    {baseUnit?.name ??
                                      "base units"}
                                  </p>

                                  {hasBulkDiscount ? (
                                    <p className="mt-2 text-sm font-medium text-blue-700">
                                      Customer
                                      saves{" "}
                                      {formatMoney(
                                        row.customerSavings,
                                      )}{" "}
                                      compared
                                      with
                                      buying{" "}
                                      {
                                        row.quantityInBaseUnit
                                      }{" "}
                                      {baseUnit?.name ??
                                        "base units"}{" "}
                                      individually.
                                    </p>
                                  ) : null}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {hasBulkDiscount ? (
                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                      Bulk
                                      Discount{" "}
                                      {row.discountPercent.toFixed(
                                        1,
                                      )}
                                      %
                                    </span>
                                  ) : null}

                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                      profitable
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {profitable
                                      ? "Profitable"
                                      : "Loss"}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                                <Metric
                                  label="Actual Cost"
                                  value={formatMoney(
                                    row.totalCost,
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

                                <Metric
                                  label={`Effective Price / ${
                                    baseUnit?.name ??
                                    "Base Unit"
                                  }`}
                                  value={formatMoney(
                                    row.effectivePricePerBaseUnit,
                                  )}
                                />

                                <Metric
                                  label="Individual Retail Value"
                                  value={
                                    row.normalRetailValue >
                                    0
                                      ? formatMoney(
                                          row.normalRetailValue,
                                        )
                                      : "—"
                                  }
                                />
                              </div>

                              {isBulk &&
                              row.normalRetailValue >
                                0 ? (
                                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <span className="text-slate-600">
                                      Buying{" "}
                                      {
                                        row.quantityInBaseUnit
                                      }{" "}
                                      {baseUnit?.name ??
                                        "base units"}{" "}
                                      individually
                                    </span>

                                    <span className="font-semibold text-slate-900">
                                      {formatMoney(
                                        row.normalRetailValue,
                                      )}
                                    </span>
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <span className="text-slate-600">
                                      Buying
                                      as{" "}
                                      {
                                        row.unitName
                                      }
                                    </span>

                                    <span className="font-semibold text-slate-900">
                                      {formatMoney(
                                        row.sellingPrice,
                                      )}
                                    </span>
                                  </div>

                                  {row.customerSavings >
                                  0 ? (
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                                      <span className="font-semibold text-blue-700">
                                        Customer
                                        saves
                                      </span>

                                      <span className="font-bold text-blue-700">
                                        {formatMoney(
                                          row.customerSavings,
                                        )}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {row.priceRules
                                .length >
                              0 ? (
                                <div className="mt-4">
                                  <p className="mb-2 text-sm font-semibold text-slate-800">
                                    Quantity
                                    Deals
                                  </p>

                                  <div className="space-y-2">
                                    {row.priceRules.map(
                                      (
                                        rule,
                                        ruleIndex,
                                      ) => {
                                        const ruleProfitable =
                                          rule.profit >=
                                          0;

                                        return (
                                          <div
                                            key={
                                              ruleIndex
                                            }
                                            className={`rounded-xl border p-3 ${
                                              ruleProfitable
                                                ? "border-slate-200 bg-white"
                                                : "border-red-200 bg-red-50"
                                            }`}
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <p className="text-sm font-semibold text-slate-800">
                                                {
                                                  rule.quantity
                                                }{" "}
                                                ×{" "}
                                                {
                                                  row.unitName
                                                }{" "}
                                                for{" "}
                                                {formatMoney(
                                                  rule.price,
                                                )}
                                              </p>

                                              <span
                                                className={`text-xs font-semibold ${
                                                  ruleProfitable
                                                    ? "text-emerald-700"
                                                    : "text-red-700"
                                                }`}
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

                                            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                                              <SmallMetric
                                                label="Actual Cost"
                                                value={formatMoney(
                                                  rule.cost,
                                                )}
                                              />

                                              <SmallMetric
                                                label="Deal Price"
                                                value={formatMoney(
                                                  rule.price,
                                                )}
                                              />

                                              <SmallMetric
                                                label={`Effective / ${
                                                  baseUnit?.name ??
                                                  "Base Unit"
                                                }`}
                                                value={formatMoney(
                                                  rule.effectivePrice,
                                                )}
                                              />

                                              <SmallMetric
                                                label="Margin"
                                                value={`${rule.margin.toFixed(
                                                  1,
                                                )}%`}
                                              />

                                              <SmallMetric
                                                label="Customer Saves"
                                                value={
                                                  rule.savings >
                                                  0
                                                    ? formatMoney(
                                                        rule.savings,
                                                      )
                                                    : "—"
                                                }
                                              />
                                            </div>
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

                {pricingWarnings.length >
                0 ? (
                  <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <h3 className="font-bold text-red-800">
                      Pricing problem
                    </h3>

                    <p className="mt-1 text-sm text-red-700">
                      This is not about
                      offering a bulk
                      discount. One or
                      more prices are
                      actually below the
                      cost of the goods.
                    </p>

                    <div className="mt-3 space-y-2 text-sm text-red-700">
                      {pricingWarnings.map(
                        (
                          warning,
                          index,
                        ) => (
                          <p
                            key={
                              index
                            }
                          >
                            •{" "}
                            {
                              warning.message
                            }
                          </p>
                        ),
                      )}
                    </div>
                  </section>
                ) : null}

                {form.currentCostPrice ==
                  null ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Enter a cost
                    price to activate
                    automatic profit,
                    margin and bulk
                    discount checks.
                  </div>
                ) : null}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={
                      closeForm
                    }
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

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white/70 p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}