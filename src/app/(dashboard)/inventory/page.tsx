"use client";

import { useMemo, useState } from "react";
import DataTable from "@/components/ui/data-table";
import SummaryCard from "@/components/shared/summary-card";
import RestockForm from "@/features/inventory/components/restock-form";
import { useAppStore } from "@/store/app-store";

function getStockBadge(stock: number, lowStock: number) {
  if (stock === 0) {
    return (
      <span className="inline-flex rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
        Out of stock
      </span>
    );
  }

  if (stock <= lowStock) {
    return (
      <span className="inline-flex rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-600">
        Low stock
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
      In stock
    </span>
  );
}

function getStockText(stock: number, lowStock: number) {
  if (stock === 0) {
    return <span className="font-semibold text-red-600">Out</span>;
  }

  if (stock <= lowStock) {
    return <span className="font-semibold text-amber-600">{stock} (Low)</span>;
  }

  return <span className="font-semibold text-emerald-600">{stock}</span>;
}

export default function InventoryPage() {
  const items = useAppStore((state) => state.products);
  const restockHistory = useAppStore((state) => state.restockHistory);
  const restockProduct = useAppStore((state) => state.restockProduct);

  const [search, setSearch] = useState("");
  const [restockingItemId, setRestockingItemId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const totalItems = items.length;
  const lowStockItems = items.filter(
    (item) => item.stock > 0 && item.stock <= item.lowStock
  ).length;
  const outOfStockItems = items.filter((item) => item.stock === 0).length;
  const stockValue = items.reduce((sum, item) => sum + item.stock * item.price, 0);

  const restockingItem =
    items.find((item) => item.id === restockingItemId) ?? null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Inventory
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">
          Monitor stock levels, restock products, and track inventory pressure.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Inventory Items" value={totalItems} />
        <SummaryCard title="Low Stock Items" value={lowStockItems} />
        <SummaryCard title="Out of Stock Items" value={outOfStockItems} />
        <SummaryCard
          title="Estimated Stock Value"
          value={`₦${stockValue.toLocaleString()}`}
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full">
          <input
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 sm:max-w-md"
            placeholder="Search inventory by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <p className="text-sm text-slate-500">
          {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"} found
        </p>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm sm:p-10">
          No inventory items found.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="break-words text-base font-semibold text-slate-900">
                      {item.name}
                    </h2>
                    {getStockBadge(item.stock, item.lowStock)}
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-800">Category:</span>{" "}
                      {item.category}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Owner:</span>{" "}
                      {item.ownerName}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Unit:</span>{" "}
                      {item.unit}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Stock:</span>{" "}
                      {getStockText(item.stock, item.lowStock)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Value:</span>{" "}
                      ₦{(item.stock * item.price).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Low Stock Threshold:</span>{" "}
                      {item.lowStock}
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => setRestockingItemId(item.id)}
                      className="w-full rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tablet/Desktop table */}
          <div className="hidden md:block">
            <DataTable
              data={filteredItems}
              columns={[
                { header: "Name", accessor: "name" },
                { header: "Category", accessor: "category" },
                { header: "Owner", accessor: "ownerName" },
                { header: "Unit", accessor: "unit" },
                {
                  header: "Stock",
                  accessor: "stock",
                  render: (row) => {
                    if (row.stock === 0) {
                      return <span className="font-semibold text-red-600">Out</span>;
                    }

                    if (row.stock <= row.lowStock) {
                      return (
                        <span className="font-semibold text-amber-600">
                          {row.stock} (Low)
                        </span>
                      );
                    }

                    return row.stock;
                  },
                },
                {
                  header: "Value",
                  accessor: "price",
                  render: (row) => `₦${(row.stock * row.price).toLocaleString()}`,
                },
                {
                  header: "Actions",
                  accessor: "id",
                  render: (row) => (
                    <button
                      onClick={() => setRestockingItemId(row.id)}
                      className="text-sm font-medium text-emerald-600 hover:underline"
                    >
                      Restock
                    </button>
                  ),
                },
              ]}
            />
          </div>
        </>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Recent Restock Activity
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest inventory updates from the shared store.
          </p>
        </div>

        <div className="space-y-3">
          {restockHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 sm:p-6">
              No restock activity yet.
            </div>
          ) : (
            restockHistory.map((record) => (
              <div key={record.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-900">
                      {record.productName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {record.createdAt}
                    </p>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    <p className="font-semibold text-emerald-600">
                      +{record.quantityAdded}
                    </p>
                    <p className="text-sm text-slate-500">
                      {record.previousStock} → {record.newStock}
                    </p>
                  </div>
                </div>

                {record.note ? (
                  <p className="mt-3 break-words text-sm text-slate-600">
                    {record.note}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      {restockingItem && (
        <RestockForm
          item={restockingItem}
          onSave={({ productId, quantityAdded, note }) =>
            restockProduct({ productId, quantityAdded, note })
          }
          onClose={() => setRestockingItemId(null)}
        />
      )}
    </div>
  );
}