"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type StockTakeProduct = {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
};

type Props = {
  products: StockTakeProduct[];
};

export default function BulkStockTakeButton({
  products,
}: Props) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    counts,
    setCounts,
  ] = useState<
    Record<string, string>
  >({});

  const [
    note,
    setNote,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return products;
      }

      return products.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(query) ||
          product.category
            .toLowerCase()
            .includes(query),
      );
    }, [
      products,
      search,
    ]);

  const enteredItems =
    useMemo(() => {
      return products
        .map((product) => {
          const value =
            counts[
              product.id
            ];

          if (
            value == null ||
            value.trim() ===
              ""
          ) {
            return null;
          }

          const countedStock =
            Number(value);

          return {
            ...product,
            countedStock,
            difference:
              countedStock -
              product.stock,
          };
        })
        .filter(
          (
            item,
          ): item is StockTakeProduct & {
            countedStock: number;
            difference: number;
          } =>
            item !== null,
        );
    }, [
      counts,
      products,
    ]);

  const changedItems =
    enteredItems.filter(
      (item) =>
        Number.isInteger(
          item.countedStock,
        ) &&
        item.countedStock >=
          0 &&
        item.difference !==
          0,
    );

  const invalidItems =
    enteredItems.filter(
      (item) =>
        !Number.isInteger(
          item.countedStock,
        ) ||
        item.countedStock <
          0,
    );

  const increaseCount =
    changedItems.filter(
      (item) =>
        item.difference >
        0,
    ).length;

  const decreaseCount =
    changedItems.filter(
      (item) =>
        item.difference <
        0,
    ).length;

  function closeModal() {
    if (saving) {
      return;
    }

    setOpen(false);
    setSearch("");
    setCounts({});
    setNote("");
    setError("");
  }

  function differenceText(
    product: StockTakeProduct,
  ) {
    const value =
      counts[product.id];

    if (
      value == null ||
      value.trim() === ""
    ) {
      return "—";
    }

    const counted =
      Number(value);

    if (
      !Number.isInteger(
        counted,
      ) ||
      counted < 0
    ) {
      return "Invalid";
    }

    const difference =
      counted -
      product.stock;

    if (
      difference === 0
    ) {
      return "No change";
    }

    return difference > 0
      ? `+${difference}`
      : String(
          difference,
        );
  }

  async function saveStockTake() {
    setError("");

    if (
      invalidItems.length >
      0
    ) {
      setError(
        "All physical counts must be whole numbers of 0 or more.",
      );

      return;
    }

    if (
      changedItems.length ===
      0
    ) {
      setError(
        "Enter at least one physical count that differs from the system stock.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Apply ${changedItems.length} stock correction${
          changedItems.length ===
          1
            ? ""
            : "s"
        }?\n\n` +
          `${increaseCount} product${
            increaseCount ===
            1
              ? ""
              : "s"
          } will increase.\n` +
          `${decreaseCount} product${
            decreaseCount ===
            1
              ? ""
              : "s"
          } will decrease.`,
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/inventory/bulk-recount",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  note:
                    note.trim(),

                  items:
                    changedItems.map(
                      (
                        item,
                      ) => ({
                        productId:
                          item.id,

                        expectedCurrentStock:
                          item.stock,

                        countedStock:
                          item.countedStock,
                      }),
                    ),
                },
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
        throw new Error(
          data?.error ||
            "Failed to complete stock take.",
        );
      }

      closeModal();

      router.refresh();

      alert(
        `Stock take completed.\n\n` +
          `${data.changedProducts ?? changedItems.length} product(s) corrected.\n` +
          `Total increase: ${data.increasedBy ?? 0} base unit(s).\n` +
          `Total decrease: ${data.decreasedBy ?? 0} base unit(s).`,
      );
    } catch (error) {
      console.error(
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to complete stock take.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
      >
        Stock Take / Recount
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-3 sm:p-6">
          <div className="mx-auto w-full max-w-6xl rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Bulk Stock Take
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Enter the actual physical
                  quantity you counted. Leave a
                  product blank if you did not
                  count it.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Search Products
                  </span>

                  <input
                    type="search"
                    value={
                      search
                    }
                    onChange={(
                      event,
                    ) =>
                      setSearch(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Search product or category"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Stock Take Note
                  </span>

                  <input
                    type="text"
                    value={
                      note
                    }
                    onChange={(
                      event,
                    ) =>
                      setNote(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="e.g. Morning physical count"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Corrections
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {
                      changedItems.length
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Increasing
                  </p>

                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {
                      increaseCount
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                    Decreasing
                  </p>

                  <p className="mt-1 text-2xl font-bold text-amber-700">
                    {
                      decreaseCount
                    }
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="max-h-[55vh] overflow-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          Product
                        </th>

                        <th className="px-4 py-3 font-medium">
                          Category
                        </th>

                        <th className="px-4 py-3 font-medium">
                          Base Unit
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          System Stock
                        </th>

                        <th className="px-4 py-3 font-medium">
                          Physical Count
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          Difference
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProducts.map(
                        (
                          product,
                        ) => {
                          const difference =
                            differenceText(
                              product,
                            );

                          return (
                            <tr
                              key={
                                product.id
                              }
                              className="border-t border-slate-100"
                            >
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {
                                  product.name
                                }
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                {
                                  product.category
                                }
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                {
                                  product.unit
                                }
                              </td>

                              <td className="px-4 py-3 text-right font-semibold text-slate-800">
                                {
                                  product.stock
                                }
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={
                                    counts[
                                      product.id
                                    ] ??
                                    ""
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setCounts(
                                      (
                                        previous,
                                      ) => ({
                                        ...previous,

                                        [product.id]:
                                          event
                                            .target
                                            .value,
                                      }),
                                    )
                                  }
                                  placeholder="Counted"
                                  className="w-32 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
                                />
                              </td>

                              <td
                                className={`px-4 py-3 text-right font-semibold ${
                                  difference.startsWith(
                                    "+",
                                  )
                                    ? "text-emerald-600"
                                    : difference.startsWith(
                                          "-",
                                        )
                                      ? "text-amber-600"
                                      : difference ===
                                          "Invalid"
                                        ? "text-red-600"
                                        : "text-slate-500"
                                }`}
                              >
                                {
                                  difference
                                }
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Stock take changes only the
                recorded quantity. It does not
                change the product&apos;s cost
                price, selling price or previous
                sales.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    saveStockTake
                  }
                  disabled={
                    saving ||
                    changedItems.length ===
                      0
                  }
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Applying Recount..."
                    : `Apply ${changedItems.length} Correction${
                        changedItems.length ===
                        1
                          ? ""
                          : "s"
                      }`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}