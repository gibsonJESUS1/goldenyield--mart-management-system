"use client";

import { useEffect, useMemo, useState } from "react";
import SummaryCard from "@/components/shared/summary-card";

type PaymentStatus = "paid" | "partial" | "owed";

type ProductSaleUnitPriceRule = {
  id: string;
  quantity: number;
  price: number;
  active: boolean;
};

type ProductSaleUnit = {
  id: string;
  unitId: string;
  unitName: string;
  quantityInBaseUnit: number;
  sellingPrice: number;
  isDefault: boolean;
  active: boolean;
  priceRules?: ProductSaleUnitPriceRule[];
};

type SaleProduct = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  categoryId: string;
  category: string;
  unitId: string;
  unit: string;
  stock: number;
  lowStock: number;
  active: boolean;
  saleUnits: ProductSaleUnit[];
};

type CartItem = {
  productId: string;
  productName: string;
  ownerName: string;
  saleUnitId: string;
  saleUnitName: string;
  quantityInBaseUnit: number;
  unitPrice: number;
  quantity: number;
  total: number;
  baseUnitsConsumed: number;
};

type SaleRecord = {
  id: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
};

function calculateBestFitTotal(
  quantity: number,
  basePrice: number,
  priceRules?: ProductSaleUnitPriceRule[]
) {
  if (!priceRules || priceRules.length === 0) {
    return quantity * basePrice;
  }

  const activeRules = [...priceRules]
    .filter((rule) => rule.active && rule.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity);

  if (activeRules.length === 0) {
    return quantity * basePrice;
  }

  let remaining = quantity;
  let total = 0;

  for (const rule of activeRules) {
    const count = Math.floor(remaining / rule.quantity);
    if (count > 0) {
      total += count * rule.price;
      remaining -= count * rule.quantity;
    }
  }

  if (remaining > 0) {
    total += remaining * basePrice;
  }

  return total;
}

export default function SalesPage() {
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [range, setRange] = useState("today");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSaleUnitId, setSelectedSaleUnitId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [customerName, setCustomerName] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
  const [amountPaid, setAmountPaid] = useState("");

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [savingSale, setSavingSale] = useState(false);

  async function loadSales() {
    try {
      setLoadingSales(true);

      const res = await fetch(`/api/sales?range=${range}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch sales");
      }

      const data = (await res.json()) as Array<{
        id: string;
        customerName?: string;
        subtotal: number;
        amountPaid: number;
        balance: number;
        paymentStatus: PaymentStatus;
        createdAt: string;
        items: Array<{
          id: string;
          productId: string;
          productName: string;
          productSaleUnitId: string;
          saleUnitName: string;
          quantity: number;
          unitPrice: number;
          total: number;
          baseUnitsConsumed: number;
        }>;
      }>;

      setSalesHistory(
        data.map((sale) => ({
          id: sale.id,
          customerName: sale.customerName || "Walk-in Customer",
          subtotal: sale.subtotal,
          amountPaid: sale.amountPaid,
          balance: sale.balance,
          paymentStatus: sale.paymentStatus,
          createdAt: new Date(sale.createdAt).toLocaleString(),
          items: sale.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            ownerName: "",
            saleUnitId: item.productSaleUnitId,
            saleUnitName: item.saleUnitName,
            quantityInBaseUnit: 0,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            total: item.total,
            baseUnitsConsumed: item.baseUnitsConsumed,
          })),
        }))
      );
    } catch (error) {
      console.error(error);
      alert("Failed to load sales");
    } finally {
      setLoadingSales(false);
    }
  }

  async function loadProducts() {
    try {
      setLoadingProducts(true);

      const res = await fetch("/api/products", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch products");
      }

      const data: SaleProduct[] = await res.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
      alert("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadSales();
  }, [range]);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? null;

  const availableSaleUnits =
    selectedProduct?.saleUnits.filter((saleUnit) => saleUnit.active) ?? [];

  const selectedSaleUnit =
    availableSaleUnits.find((saleUnit) => saleUnit.id === selectedSaleUnitId) ??
    null;

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedSaleUnitId("");
      return;
    }

    const defaultSaleUnit =
      selectedProduct.saleUnits.find((saleUnit) => saleUnit.isDefault) ??
      selectedProduct.saleUnits[0];

    setSelectedSaleUnitId(defaultSaleUnit?.id ?? "");
  }, [selectedProductId, selectedProduct]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const parsedAmountPaid = Number(amountPaid || 0);

  const balance = useMemo(() => {
    if (paymentStatus === "owed") return subtotal;
    if (paymentStatus === "partial") {
      return Math.max(subtotal - parsedAmountPaid, 0);
    }
    return 0;
  }, [paymentStatus, subtotal, parsedAmountPaid]);

  function addItemToCart() {
    if (!selectedProduct || !selectedSaleUnit || !quantity) return;

    const parsedQty = Number(quantity);
    if (!parsedQty || parsedQty <= 0) return;

    const baseUnitsConsumed = parsedQty * selectedSaleUnit.quantityInBaseUnit;

    if (baseUnitsConsumed > selectedProduct.stock) {
      alert(
        `Not enough stock. Available base stock is ${selectedProduct.stock} ${selectedProduct.unit}.`
      );
      return;
    }

    const existingItem = cartItems.find(
      (item) =>
        item.productId === selectedProduct.id &&
        item.saleUnitId === selectedSaleUnit.id
    );

    if (existingItem) {
      const nextQty = existingItem.quantity + parsedQty;
      const nextBaseUnits = nextQty * selectedSaleUnit.quantityInBaseUnit;

      if (nextBaseUnits > selectedProduct.stock) {
        alert(
          `Not enough stock for this quantity. Available base stock is ${selectedProduct.stock} ${selectedProduct.unit}.`
        );
        return;
      }

      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === selectedProduct.id &&
          item.saleUnitId === selectedSaleUnit.id
            ? {
                ...item,
                quantity: nextQty,
                total: calculateBestFitTotal(
                  nextQty,
                  item.unitPrice,
                  selectedSaleUnit.priceRules
                ),
                baseUnitsConsumed: nextBaseUnits,
              }
            : item
        )
      );
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          ownerName: selectedProduct.ownerName,
          saleUnitId: selectedSaleUnit.id,
          saleUnitName: selectedSaleUnit.unitName,
          quantityInBaseUnit: selectedSaleUnit.quantityInBaseUnit,
          unitPrice: selectedSaleUnit.sellingPrice,
          quantity: parsedQty,
          total: calculateBestFitTotal(
            parsedQty,
            selectedSaleUnit.sellingPrice,
            selectedSaleUnit.priceRules
          ),
          baseUnitsConsumed,
        },
      ]);
    }

    setQuantity("1");
  }

  function removeItem(productId: string, saleUnitId: string) {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !(item.productId === productId && item.saleUnitId === saleUnitId)
      )
    );
  }

  async function saveSale() {
    if (cartItems.length === 0) return;

    setSavingSale(true);

    try {
      const groupedStockReduction = new Map<string, number>();

      for (const item of cartItems) {
        const current = groupedStockReduction.get(item.productId) ?? 0;
        groupedStockReduction.set(
          item.productId,
          current + item.baseUnitsConsumed
        );
      }

      for (const [productId, quantityToReduce] of groupedStockReduction) {
        const res = await fetch(`/api/products/${productId}/stock`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quantityToReduce }),
        });

        if (!res.ok) {
          throw new Error("Failed to reduce stock");
        }
      }

      const resolvedAmountPaid =
        paymentStatus === "paid"
          ? subtotal
          : paymentStatus === "owed"
          ? 0
          : parsedAmountPaid;

      const salePayload = {
        customerName: customerName.trim() || "Walk-in Customer",
        subtotal,
        amountPaid: resolvedAmountPaid,
        balance:
          paymentStatus === "paid"
            ? 0
            : Math.max(subtotal - resolvedAmountPaid, 0),
        paymentStatus,
        items: cartItems.map((item) => ({
          productId: item.productId,
          productSaleUnitId: item.saleUnitId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          baseUnitsConsumed: item.baseUnitsConsumed,
        })),
      };

      const saleRes = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(salePayload),
      });

      if (!saleRes.ok) {
        throw new Error("Failed to save sale");
      }

      await saleRes.json();

      setCartItems([]);
      setCustomerName("");
      setPaymentStatus("paid");
      setAmountPaid("");
      setSelectedProductId("");
      setSelectedSaleUnitId("");
      setQuantity("1");

      await Promise.all([loadProducts(), loadSales()]);
      alert("Sale saved and stock updated.");
    } catch (error) {
      console.error(error);
      alert("Failed to save sale");
    } finally {
      setSavingSale(false);
    }
  }

  const totalSalesRecords = salesHistory.length;
  const owedSalesCount = salesHistory.filter(
    (sale) => sale.paymentStatus === "owed" || sale.balance > 0
  ).length;
  const totalOutstanding = salesHistory.reduce(
    (sum, sale) => sum + sale.balance,
    0
  );

  if (loadingProducts) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Sales</h1>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading products...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sales</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sell products by real selling units and reduce base stock correctly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="month">This month</option>
          </select>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Sales Records" value={totalSalesRecords} />
        <SummaryCard title="Outstanding Sales" value={owedSalesCount} />
        <SummaryCard
          title="Outstanding Balance"
          value={`₦${totalOutstanding.toLocaleString()}`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Create Sale</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a product, selling unit, and quantity.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Customer Name (Optional)">
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="e.g. Adebayo"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </Field>

            <Field label="Product">
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — Base Stock: {product.stock} {product.unit}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Selling Unit">
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                value={selectedSaleUnitId}
                onChange={(e) => setSelectedSaleUnitId(e.target.value)}
                disabled={!selectedProduct}
              >
                <option value="">Select selling unit</option>
                {availableSaleUnits.map((saleUnit) => (
                  <option key={saleUnit.id} value={saleUnit.id}>
                    {saleUnit.unitName} — ₦{saleUnit.sellingPrice.toLocaleString()} — uses{" "}
                    {saleUnit.quantityInBaseUnit} base
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quantity">
              <input
                type="number"
                min="1"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>

            <div className="md:col-span-2 flex items-end">
              <button
                onClick={addItemToCart}
                type="button"
                className="w-full rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white shadow hover:bg-emerald-700"
              >
                Add Item
              </button>
            </div>
          </div>

          {selectedProduct && selectedSaleUnit && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Base unit: <span className="font-semibold">{selectedProduct.unit}</span>
              </p>
              <p>
                This selling unit uses{" "}
                <span className="font-semibold">
                  {selectedSaleUnit.quantityInBaseUnit}
                </span>{" "}
                base unit(s) per quantity sold.
              </p>

              {selectedSaleUnit.priceRules && selectedSaleUnit.priceRules.length > 0 ? (
                <div className="mt-2">
                  <p className="font-medium text-slate-700">Price rules:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedSaleUnit.priceRules.map((rule) => (
                      <span
                        key={rule.id}
                        className="rounded-full bg-white px-3 py-1 text-xs text-slate-700"
                      >
                        {rule.quantity} = ₦{rule.price.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {cartItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No items added yet.
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={`${item.productId}-${item.saleUnitId}`}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.productName}</p>
                    <p className="text-sm text-slate-500">
                      {item.ownerName} • {item.quantity} {item.saleUnitName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Consumes {item.baseUnitsConsumed} base unit(s)
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="font-semibold text-slate-900">
                      ₦{item.total.toLocaleString()}
                    </p>
                    <button
                      onClick={() => removeItem(item.productId, item.saleUnitId)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Payment Summary</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose whether the sale is paid, partial, or owed.
            </p>
          </div>

          <div className="space-y-4">
            <Field label="Payment Status">
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              >
                <option value="paid">Paid</option>
                <option value="partial">Partial Payment</option>
                <option value="owed">Owed</option>
              </select>
            </Field>

            {paymentStatus === "partial" && (
              <Field label="Amount Paid">
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="Enter amount paid"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </Field>
            )}

            <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-900">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Amount Paid</span>
                <span className="font-semibold text-slate-900">
                  ₦
                  {(
                    paymentStatus === "paid"
                      ? subtotal
                      : paymentStatus === "owed"
                      ? 0
                      : parsedAmountPaid
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Balance</span>
                <span className="font-semibold text-red-600">
                  ₦{balance.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={saveSale}
              type="button"
              disabled={savingSale}
              className="w-full rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white shadow hover:bg-slate-800 disabled:opacity-60"
            >
              {savingSale ? "Saving..." : "Save Sale"}
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Sales</h2>
          <p className="mt-1 text-sm text-slate-500">
            Transactions recorded in the database.
          </p>
        </div>

        <div className="space-y-3">
          {loadingSales ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              Loading sales...
            </div>
          ) : salesHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No sales recorded yet.
            </div>
          ) : (
            salesHistory.map((sale) => (
              <div key={sale.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{sale.customerName}</p>
                    <p className="text-sm text-slate-500">{sale.createdAt}</p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      ₦{sale.subtotal.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500 capitalize">
                      {sale.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {sale.items.map((item) => (
                    <span
                      key={`${sale.id}-${item.productId}-${item.saleUnitId}`}
                      className="rounded-full bg-white px-3 py-1 text-xs text-slate-600"
                    >
                      {item.productName} × {item.quantity} {item.saleUnitName}
                    </span>
                  ))}
                </div>

                {sale.balance > 0 && (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    Outstanding balance: ₦{sale.balance.toLocaleString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
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