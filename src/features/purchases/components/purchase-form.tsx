"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProductOption = {
  id: string;
  name: string;
  unitName: string;
  stock: number;
  currentCostPrice: number | null;
};

type PurchaseItemForm = {
  productId: string;
  quantityInBaseUnit: string;
  unitCostPrice: string;
};

type PurchaseFormProps = {
  products: ProductOption[];
};

const emptyItem: PurchaseItemForm = {
  productId: "",
  quantityInBaseUnit: "",
  unitCostPrice: "",
};

export function PurchaseForm({ products }: PurchaseFormProps) {
  const router = useRouter();

  const [reference, setReference] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [note, setNote] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [items, setItems] = useState<PurchaseItemForm[]>([{ ...emptyItem }]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, field: keyof PurchaseItemForm, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantityInBaseUnit || 0);
      const cost = Number(item.unitCostPrice || 0);
      return sum + qty * cost;
    }, 0);
  }, [items]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        reference,
        supplierName,
        note,
        purchasedAt,
        items: items.map((item) => ({
          productId: item.productId,
          quantityInBaseUnit: Number(item.quantityInBaseUnit),
          unitCostPrice: Number(item.unitCostPrice),
        })),
      };

      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create purchase");
      }

      setReference("");
      setSupplierName("");
      setNote("");
      setPurchasedAt("");
      setItems([{ ...emptyItem }]);
      setMessage("Purchase saved successfully.");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">New Purchase</h2>
        <p className="mt-1 text-sm text-gray-600">
          Record stock-in and update cost price.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Reference</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Invoice / ref"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Supplier Name</label>
          <input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Supplier"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Purchase Date</label>
          <input
            type="datetime-local"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Optional note"
          />
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const selectedProduct = products.find((product) => product.id === item.productId);
          const qty = Number(item.quantityInBaseUnit || 0);
          const cost = Number(item.unitCostPrice || 0);
          const lineTotal = qty * cost;

          return (
            <div
              key={index}
              className="grid gap-4 rounded-xl border border-gray-200 p-4 md:grid-cols-12"
            >
              <div className="space-y-2 md:col-span-5">
                <label className="text-sm font-medium">Product</label>
                <select
                  value={item.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    const product = products.find((p) => p.id === productId);

                    updateItem(index, "productId", productId);
                    if (product?.currentCostPrice != null && !item.unitCostPrice) {
                      updateItem(index, "unitCostPrice", String(product.currentCostPrice));
                    }
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.unitName}) - Stock: {product.stock}
                    </option>
                  ))}
                </select>
                {selectedProduct ? (
                  <p className="text-xs text-gray-500">
                    Current stock: {selectedProduct.stock} {selectedProduct.unitName}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantityInBaseUnit}
                  onChange={(e) => updateItem(index, "quantityInBaseUnit", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Unit Cost</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.unitCostPrice}
                  onChange={(e) => updateItem(index, "unitCostPrice", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Line Total</label>
                <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
                  {lineTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="flex items-end md:col-span-1">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addItem}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Add Item
        </button>
      </div>

      <div className="rounded-xl border bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Total Amount</span>
          <span className="text-lg font-semibold">
            {totalAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {message ? <p className="text-sm text-green-600">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Purchase"}
        </button>
      </div>
    </form>
  );
}