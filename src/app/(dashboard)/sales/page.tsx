"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import SummaryCard from "@/components/shared/summary-card";

type PaymentStatus = "paid" | "partial" | "owed";
type SaleMode = "STANDARD" | "WEIGHT_KG" | "VARIABLE_PIECE";

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

  weightTrackingEnabled: boolean;
  weightStockGrams: number;
  lowWeightStockGrams: number;
  costPerKg: number | null;
  pricePerKg: number | null;

  allowVariablePiecePrice: boolean;
  minPiecePrice: number | null;
  maxPiecePrice: number | null;

  saleUnits: ProductSaleUnit[];
};

type CartItem = {
  key: string;

  productId: string;
  productName: string;
  ownerName: string;

  mode: SaleMode;

  saleUnitId?: string;
  saleUnitName: string;

  quantityInBaseUnit: number;

  unitPrice: number;
  quantity: number;
  total: number;

  baseUnitsConsumed: number;

  weightGrams?: number;
  manualUnitPrice?: number;

  priceRules?: ProductSaleUnitPriceRule[];
};

type SaleRecordItem = {
  id: string;
  productId: string;
  productName: string;
  saleMode: SaleMode;
  saleUnitName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  weightGrams?: number | null;
};

type SaleRecord = {
  id: string;
  customerName: string;
  items: SaleRecordItem[];
  subtotal: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
};

function calculateBestFitTotal(
  quantity: number,
  basePrice: number,
  priceRules?: ProductSaleUnitPriceRule[],
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

function createCartKey(prefix: string) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()}`;
}

function money(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function kgFromGrams(grams: number) {
  return grams / 1000;
}

export const dynamic = "force-dynamic";

export default function SalesPage() {
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [range, setRange] = useState("today");

  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSaleUnitId, setSelectedSaleUnitId] = useState("");

  const [quantity, setQuantity] = useState("1");

  const [weightKg, setWeightKg] = useState("");

  const [pieceQuantity, setPieceQuantity] = useState("1");
  const [piecePrice, setPiecePrice] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("paid");
  const [amountPaid, setAmountPaid] = useState("");

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [savingSale, setSavingSale] = useState(false);

  const amountPaidInputRef = useRef<HTMLInputElement | null>(null);

  async function loadSales() {
    try {
      setLoadingSales(true);

      const response = await fetch(`/api/sales?range=${range}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sales");
      }

      const data = (await response.json()) as Array<{
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
          saleMode?: SaleMode;
          saleUnitName: string;
          quantity: number;
          unitPrice: number;
          total?: number;
          lineTotal?: number;
          weightGrams?: number | null;
        }>;
      }>;

      setSalesHistory(
        data.map((sale) => ({
          id: sale.id,
          customerName: sale.customerName || "Walk-in Customer",
          subtotal: Number(sale.subtotal),
          amountPaid: Number(sale.amountPaid),
          balance: Number(sale.balance),
          paymentStatus: sale.paymentStatus,
          createdAt: new Date(sale.createdAt).toLocaleString(),

          items: sale.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            saleMode: item.saleMode ?? "STANDARD",
            saleUnitName: item.saleUnitName,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            total: Number(item.total ?? item.lineTotal ?? 0),
            weightGrams: item.weightGrams,
          })),
        })),
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

      const response = await fetch("/api/products", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = (await response.json()) as SaleProduct[];

      setProducts(
        data.filter((product) => product.active),
      );
    } catch (error) {
      console.error(error);
      alert("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    void loadSales();
  }, [range]);

  useEffect(() => {
    if (paymentStatus === "partial") {
      amountPaidInputRef.current?.focus();
    }
  }, [paymentStatus]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.ownerName.toLowerCase().includes(query),
    );
  }, [products, search]);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? null;

  const availableSaleUnits = useMemo(() => {
    if (!selectedProduct) {
      return [];
    }

    return selectedProduct.saleUnits.filter((saleUnit) => {
      if (!saleUnit.active) {
        return false;
      }

      /*
       * When this product uses manual whole-piece pricing,
       * hide the ordinary 1-base-unit row from the cashier.
       * This prevents accidentally selling the same whole fish
       * at a fixed price instead of pricing it by size.
       */
      if (
        selectedProduct.allowVariablePiecePrice &&
        saleUnit.unitId === selectedProduct.unitId &&
        saleUnit.quantityInBaseUnit === 1
      ) {
        return false;
      }

      return true;
    });
  }, [selectedProduct]);

  const selectedSaleUnit =
    availableSaleUnits.find(
      (saleUnit) => saleUnit.id === selectedSaleUnitId,
    ) ?? null;

  useEffect(() => {
    setWeightKg("");
    setPieceQuantity("1");
    setPiecePrice("");

    if (!selectedProduct) {
      setSelectedSaleUnitId("");
      return;
    }

    const defaultSaleUnit =
      availableSaleUnits.find((saleUnit) => saleUnit.isDefault) ??
      availableSaleUnits[0];

    setSelectedSaleUnitId(defaultSaleUnit?.id ?? "");
  }, [selectedProduct, availableSaleUnits]);

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.total,
        0,
      ),
    [cartItems],
  );

  const parsedAmountPaid = Number(amountPaid || 0);

  const balance = useMemo(() => {
    if (paymentStatus === "owed") {
      return subtotal;
    }

    if (paymentStatus === "partial") {
      return Math.max(subtotal - parsedAmountPaid, 0);
    }

    return 0;
  }, [paymentStatus, subtotal, parsedAmountPaid]);

  function getProductById(productId: string) {
    return products.find((product) => product.id === productId) ?? null;
  }

  function getCartCountForProduct(
    productId: string,
    excludeKey?: string,
  ) {
    return cartItems
      .filter(
        (item) =>
          item.productId === productId &&
          item.key !== excludeKey,
      )
      .reduce(
        (sum, item) => sum + item.baseUnitsConsumed,
        0,
      );
  }

  function getCartWeightForProduct(productId: string) {
    return cartItems
      .filter(
        (item) =>
          item.productId === productId &&
          item.mode === "WEIGHT_KG",
      )
      .reduce(
        (sum, item) => sum + (item.weightGrams ?? 0),
        0,
      );
  }

  function addStandardItem() {
    if (!selectedProduct || !selectedSaleUnit || !quantity) {
      return;
    }

    const parsedQty = Number(quantity);

    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      alert("Enter a valid whole number quantity.");
      return;
    }

    const baseUnitsConsumed =
      parsedQty * selectedSaleUnit.quantityInBaseUnit;

    const alreadyInCart =
      getCartCountForProduct(selectedProduct.id);

    const existingItem = cartItems.find(
      (item) =>
        item.productId === selectedProduct.id &&
        item.mode === "STANDARD" &&
        item.saleUnitId === selectedSaleUnit.id,
    );

    const existingConsumed =
      existingItem?.baseUnitsConsumed ?? 0;

    const nextTotal =
      alreadyInCart -
      existingConsumed +
      baseUnitsConsumed;

    if (nextTotal > selectedProduct.stock) {
      alert(
        `Not enough count stock. Available is ${selectedProduct.stock} ${selectedProduct.unit}.`,
      );

      return;
    }

    if (existingItem) {
      const nextQty = existingItem.quantity + parsedQty;
      const nextBaseUnits =
        nextQty * selectedSaleUnit.quantityInBaseUnit;

      setCartItems((previous) =>
        previous.map((item) =>
          item.key === existingItem.key
            ? {
                ...item,
                quantity: nextQty,
                total: calculateBestFitTotal(
                  nextQty,
                  selectedSaleUnit.sellingPrice,
                  selectedSaleUnit.priceRules,
                ),
                baseUnitsConsumed: nextBaseUnits,
                quantityInBaseUnit:
                  selectedSaleUnit.quantityInBaseUnit,
                unitPrice:
                  selectedSaleUnit.sellingPrice,
                priceRules:
                  selectedSaleUnit.priceRules,
              }
            : item,
        ),
      );
    } else {
      setCartItems((previous) => [
        ...previous,
        {
          key: createCartKey("standard"),
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          ownerName: selectedProduct.ownerName,
          mode: "STANDARD",
          saleUnitId: selectedSaleUnit.id,
          saleUnitName: selectedSaleUnit.unitName,
          quantityInBaseUnit:
            selectedSaleUnit.quantityInBaseUnit,
          unitPrice:
            selectedSaleUnit.sellingPrice,
          quantity: parsedQty,
          total: calculateBestFitTotal(
            parsedQty,
            selectedSaleUnit.sellingPrice,
            selectedSaleUnit.priceRules,
          ),
          baseUnitsConsumed,
          priceRules:
            selectedSaleUnit.priceRules,
        },
      ]);
    }

    setQuantity("1");
  }

  function addWeightItem() {
    if (
      !selectedProduct ||
      !selectedProduct.weightTrackingEnabled
    ) {
      return;
    }

    const parsedKg = Number(weightKg);

    if (!Number.isFinite(parsedKg) || parsedKg <= 0) {
      alert("Enter the weight in kilograms.");
      return;
    }

    const weightGrams = Math.round(parsedKg * 1000);

    if (weightGrams <= 0) {
      alert("Weight is too small.");
      return;
    }

    const alreadyInCart =
      getCartWeightForProduct(selectedProduct.id);

    if (
      alreadyInCart + weightGrams >
      selectedProduct.weightStockGrams
    ) {
      alert(
        `Not enough weight stock. Available is ${kgFromGrams(
          selectedProduct.weightStockGrams,
        ).toLocaleString()} kg.`,
      );

      return;
    }

    const pricePerKg = Number(
      selectedProduct.pricePerKg ?? 0,
    );

    if (pricePerKg <= 0) {
      alert("This product does not have a valid price per kg.");
      return;
    }

    const total =
      Math.round(
        (pricePerKg * (weightGrams / 1000) +
          Number.EPSILON) *
          100,
      ) / 100;

    setCartItems((previous) => [
      ...previous,
      {
        key: createCartKey("weight"),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        ownerName: selectedProduct.ownerName,
        mode: "WEIGHT_KG",
        saleUnitName: "Kg",
        quantityInBaseUnit: 0,
        unitPrice: pricePerKg,
        quantity: 1,
        total,
        baseUnitsConsumed: 0,
        weightGrams,
      },
    ]);

    setWeightKg("");
  }

  function addVariablePieceItem() {
    if (
      !selectedProduct ||
      !selectedProduct.allowVariablePiecePrice
    ) {
      return;
    }

    const parsedQty = Number(pieceQuantity);
    const parsedPrice = Number(piecePrice);

    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      alert("Enter a valid whole-number piece quantity.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      alert("Enter the price for one piece.");
      return;
    }

    const countInCart =
      getCartCountForProduct(selectedProduct.id);

    if (
      countInCart + parsedQty >
      selectedProduct.stock
    ) {
      alert(
        `Not enough piece stock. Available is ${selectedProduct.stock} ${selectedProduct.unit}.`,
      );

      return;
    }

    const min = selectedProduct.minPiecePrice;
    const max = selectedProduct.maxPiecePrice;

    if (
      (min != null && parsedPrice < min) ||
      (max != null && parsedPrice > max)
    ) {
      const normalRange =
        min != null && max != null
          ? `${money(min)}–${money(max)}`
          : "the configured range";

      const confirmed = window.confirm(
        `${money(parsedPrice)} is outside the normal ${normalRange} per-piece guide.\n\n` +
          "Continue with this legitimate size-based price?",
      );

      if (!confirmed) {
        return;
      }
    }

    setCartItems((previous) => [
      ...previous,
      {
        key: createCartKey("piece"),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        ownerName: selectedProduct.ownerName,
        mode: "VARIABLE_PIECE",
        saleUnitName: "Piece",
        quantityInBaseUnit: 1,
        unitPrice: parsedPrice,
        manualUnitPrice: parsedPrice,
        quantity: parsedQty,
        total: parsedQty * parsedPrice,
        baseUnitsConsumed: parsedQty,
      },
    ]);

    setPieceQuantity("1");
    setPiecePrice("");
  }

  function removeItem(key: string) {
    setCartItems((previous) =>
      previous.filter((item) => item.key !== key),
    );
  }

  function changeCartItemQuantity(
    key: string,
    delta: number,
  ) {
    const existingItem =
      cartItems.find((item) => item.key === key);

    if (
      !existingItem ||
      existingItem.mode === "WEIGHT_KG"
    ) {
      return;
    }

    const nextQty =
      existingItem.quantity + delta;

    if (nextQty < 1) {
      return;
    }

    const product =
      getProductById(existingItem.productId);

    if (!product) {
      return;
    }

    const nextBaseUnits =
      existingItem.mode === "VARIABLE_PIECE"
        ? nextQty
        : nextQty * existingItem.quantityInBaseUnit;

    const countAlreadyInCart =
      getCartCountForProduct(
        product.id,
        existingItem.key,
      );

    if (
      countAlreadyInCart + nextBaseUnits >
      product.stock
    ) {
      alert(
        `Not enough stock. Available is ${product.stock} ${product.unit}.`,
      );

      return;
    }

    setCartItems((previous) =>
      previous.map((item) => {
        if (item.key !== key) {
          return item;
        }

        return {
          ...item,
          quantity: nextQty,
          baseUnitsConsumed: nextBaseUnits,
          total:
            item.mode === "VARIABLE_PIECE"
              ? nextQty * item.unitPrice
              : calculateBestFitTotal(
                  nextQty,
                  item.unitPrice,
                  item.priceRules,
                ),
        };
      }),
    );
  }

  async function saveSale() {
    if (cartItems.length === 0) {
      alert("Add at least one item to the cart.");
      return;
    }

    setSavingSale(true);

    try {
      const resolvedAmountPaid =
        paymentStatus === "paid"
          ? subtotal
          : paymentStatus === "owed"
            ? 0
            : parsedAmountPaid;

      if (
        paymentStatus === "partial" &&
        (!Number.isFinite(resolvedAmountPaid) ||
          resolvedAmountPaid <= 0 ||
          resolvedAmountPaid >= subtotal)
      ) {
        throw new Error(
          "For partial payment, enter an amount greater than 0 and less than the subtotal.",
        );
      }

      const salePayload = {
        customerName:
          customerName.trim() || "Walk-in Customer",
        subtotal,
        amountPaid: resolvedAmountPaid,

        items: cartItems.map((item) => {
          if (item.mode === "WEIGHT_KG") {
            return {
              productId: item.productId,
              mode: "WEIGHT_KG" as const,
              weightGrams: item.weightGrams,
            };
          }

          if (item.mode === "VARIABLE_PIECE") {
            return {
              productId: item.productId,
              mode: "VARIABLE_PIECE" as const,
              quantity: item.quantity,
              manualUnitPrice:
                item.manualUnitPrice,
            };
          }

          return {
            productId: item.productId,
            mode: "STANDARD" as const,
            productSaleUnitId:
              item.saleUnitId,
            quantity: item.quantity,
          };
        }),
      };

      const saleResponse = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(salePayload),
      });

      const saleData =
        await saleResponse.json().catch(() => null);

      if (!saleResponse.ok) {
        throw new Error(
          saleData?.error || "Failed to save sale",
        );
      }

      setCartItems([]);
      setCustomerName("");
      setPaymentStatus("paid");
      setAmountPaid("");
      setSelectedProductId("");
      setSelectedSaleUnitId("");
      setQuantity("1");
      setWeightKg("");
      setPieceQuantity("1");
      setPiecePrice("");
      setSearch("");

      await Promise.all([
        loadProducts(),
        loadSales(),
      ]);

      alert("Sale saved and stock updated.");
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to save sale",
      );
    } finally {
      setSavingSale(false);
    }
  }

  const totalSalesRecords =
    salesHistory.length;

  const owedSalesCount =
    salesHistory.filter(
      (sale) =>
        sale.paymentStatus === "owed" ||
        sale.balance > 0,
    ).length;

  const totalOutstanding =
    salesHistory.reduce(
      (sum, sale) => sum + sale.balance,
      0,
    );

  if (loadingProducts) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Sales
        </h1>

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
          <h1 className="text-3xl font-bold text-slate-900">
            Sales
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Sell standard products, weighed fish/meat, or whole pieces priced by size.
          </p>
        </div>

        <select
          value={range}
          onChange={(event) => setRange(event.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="month">This month</option>
        </select>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Sales Records"
          value={totalSalesRecords}
        />

        <SummaryCard
          title="Outstanding Sales"
          value={owedSalesCount}
        />

        <SummaryCard
          title="Outstanding Balance"
          value={money(totalOutstanding)}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Add Product
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose the product, then use the selling method that matches what the customer asked for.
            </p>
          </div>

          <div className="space-y-4">
            <Field label="Customer Name (Optional)">
              <input
                value={customerName}
                onChange={(event) =>
                  setCustomerName(event.target.value)
                }
                placeholder="e.g. Adebayo"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </Field>

            <Field label="Search Product">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by product, category, or owner"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </Field>

            <Field label="Product">
              <select
                value={selectedProductId}
                onChange={(event) =>
                  setSelectedProductId(event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
              >
                <option value="">Select product</option>

                {filteredProducts.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name} — count {product.stock} {product.unit}
                    {product.weightTrackingEnabled
                      ? ` — weight ${kgFromGrams(
                          product.weightStockGrams,
                        )}kg`
                      : ""}
                  </option>
                ))}
              </select>
            </Field>

            {selectedProduct ? (
              <div className="grid gap-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p>
                      Count/base stock:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedProduct.stock} {selectedProduct.unit}
                      </span>
                    </p>

                    {selectedProduct.weightTrackingEnabled ? (
                      <p>
                        Weight stock:{" "}
                        <span className="font-semibold text-slate-900">
                          {kgFromGrams(
                            selectedProduct.weightStockGrams,
                          ).toLocaleString()} kg
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>

                {availableSaleUnits.length > 0 ? (
                  <SellingMethodCard
                    title="Standard Selling Unit"
                    description="Use the normal fixed selling-unit rules already configured for this product."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Selling Unit">
                        <select
                          value={selectedSaleUnitId}
                          onChange={(event) =>
                            setSelectedSaleUnitId(
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                        >
                          <option value="">
                            Select selling unit
                          </option>

                          {availableSaleUnits.map((saleUnit) => (
                            <option
                              key={saleUnit.id}
                              value={saleUnit.id}
                            >
                              {saleUnit.unitName} —{" "}
                              {money(saleUnit.sellingPrice)}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Quantity">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={quantity}
                          onChange={(event) =>
                            setQuantity(event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>
                    </div>

                    <button
                      type="button"
                      onClick={addStandardItem}
                      disabled={!selectedSaleUnit}
                      className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Add Standard Item
                    </button>
                  </SellingMethodCard>
                ) : null}

                {selectedProduct.weightTrackingEnabled ? (
                  <SellingMethodCard
                    title={`Sell by Weight — ${money(
                      Number(selectedProduct.pricePerKg ?? 0),
                    )}/kg`}
                    description="Use this when the customer asks for a weight such as 0.5kg, 0.65kg or 1.4kg."
                  >
                    <Field label="Actual weight (Kg)">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={weightKg}
                        onChange={(event) =>
                          setWeightKg(event.target.value)
                        }
                        placeholder="e.g. 0.65"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                      />
                    </Field>

                    {Number(weightKg) > 0 ? (
                      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                        Sale amount:{" "}
                        {money(
                          Number(selectedProduct.pricePerKg ?? 0) *
                            Number(weightKg),
                        )}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={addWeightItem}
                      className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Add Weight Sale
                    </button>
                  </SellingMethodCard>
                ) : null}

                {selectedProduct.allowVariablePiecePrice ? (
                  <SellingMethodCard
                    title="Sell Whole Piece by Size"
                    description="No weighing. Look at the size and enter the actual price you are charging for one piece."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Number of pieces">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={pieceQuantity}
                          onChange={(event) =>
                            setPieceQuantity(event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>

                      <Field label="Price for one piece">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={piecePrice}
                          onChange={(event) =>
                            setPiecePrice(event.target.value)
                          }
                          placeholder={
                            selectedProduct.minPiecePrice != null &&
                            selectedProduct.maxPiecePrice != null
                              ? `${selectedProduct.minPiecePrice} - ${selectedProduct.maxPiecePrice}`
                              : "Enter piece price"
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                      </Field>
                    </div>

                    {selectedProduct.minPiecePrice != null &&
                    selectedProduct.maxPiecePrice != null ? (
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Normal guide:{" "}
                        {money(selectedProduct.minPiecePrice)}
                        {" – "}
                        {money(selectedProduct.maxPiecePrice)}
                        {" "}per piece. Another legitimate price can still be used for an unusually small or large piece.
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={addVariablePieceItem}
                      className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      Add Piece Sale
                    </button>
                  </SellingMethodCard>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:self-start">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Cart & Payment
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review each item before saving the sale.
            </p>
          </div>

          <div className="space-y-3">
            {cartItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No items added yet.
              </div>
            ) : (
              <>
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.productName}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {item.mode === "WEIGHT_KG"
                              ? `${kgFromGrams(
                                  item.weightGrams ?? 0,
                                ).toLocaleString()} kg @ ${money(
                                  item.unitPrice,
                                )}/kg`
                              : item.mode === "VARIABLE_PIECE"
                                ? `${item.quantity} piece(s) @ ${money(
                                    item.unitPrice,
                                  )} each`
                                : `${item.quantity} ${item.saleUnitName}`}
                          </p>

                          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                            {item.mode === "WEIGHT_KG"
                              ? "Weight sale"
                              : item.mode === "VARIABLE_PIECE"
                                ? "Size-priced piece"
                                : "Standard sale"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        {item.mode !== "WEIGHT_KG" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                changeCartItemQuantity(
                                  item.key,
                                  -1,
                                )
                              }
                              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-white"
                            >
                              -
                            </button>

                            <span className="min-w-8 text-center font-semibold text-slate-900">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                changeCartItemQuantity(
                                  item.key,
                                  1,
                                )
                              }
                              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-white"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">
                            Exact weighed quantity
                          </span>
                        )}

                        <p className="font-semibold text-slate-900">
                          {money(item.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Clear all items from cart?")) {
                      setCartItems([]);
                    }
                  }}
                  className="w-full rounded-2xl border border-red-300 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Clear Cart
                </button>
              </>
            )}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-5">
            <div className="space-y-4">
              <Field label="Payment Status">
                <select
                  value={paymentStatus}
                  onChange={(event) =>
                    setPaymentStatus(
                      event.target.value as PaymentStatus,
                    )
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                >
                  <option value="paid">Paid</option>
                  <option value="partial">Partial Payment</option>
                  <option value="owed">Owed</option>
                </select>
              </Field>

              {paymentStatus === "partial" ? (
                <Field label="Amount Paid">
                  <input
                    ref={amountPaidInputRef}
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(event) =>
                      setAmountPaid(event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </Field>
              ) : null}

              <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                <MoneyRow
                  label="Subtotal"
                  value={subtotal}
                />

                <MoneyRow
                  label="Amount Paid"
                  value={
                    paymentStatus === "paid"
                      ? subtotal
                      : paymentStatus === "owed"
                        ? 0
                        : parsedAmountPaid
                  }
                />

                <MoneyRow
                  label="Balance"
                  value={balance}
                  danger={balance > 0}
                />
              </div>

              <button
                type="button"
                onClick={saveSale}
                disabled={
                  savingSale ||
                  cartItems.length === 0
                }
                className="w-full rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white shadow hover:bg-slate-800 disabled:opacity-60"
              >
                {savingSale ? "Saving..." : "Save Sale"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Recent Sales
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Transactions recorded in the database.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            {range}
          </p>
        </div>

        <div className="space-y-3">
          {loadingSales ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              Loading sales...
            </div>
          ) : salesHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No sales recorded for this period.
            </div>
          ) : (
            salesHistory.map((sale) => (
              <div
                key={sale.id}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {sale.customerName}
                    </p>

                    <p className="text-sm text-slate-500">
                      {sale.createdAt}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="font-semibold text-slate-900">
                      {money(sale.subtotal)}
                    </p>

                    <p className="text-sm capitalize text-slate-500">
                      {sale.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {sale.items.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-white px-3 py-1 text-xs text-slate-600"
                    >
                      {item.productName}{" "}
                      {item.saleMode === "WEIGHT_KG"
                        ? `${kgFromGrams(
                            Number(item.weightGrams ?? 0),
                          ).toLocaleString()}kg`
                        : `× ${item.quantity} ${item.saleUnitName}`}
                      {" • "}
                      {money(item.total)}
                    </span>
                  ))}
                </div>

                {sale.balance > 0 ? (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    Outstanding balance: {money(sale.balance)}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function SellingMethodCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-4">
        {children}
      </div>
    </section>
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

function MoneyRow({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span
        className={`font-semibold ${
          danger
            ? "text-red-600"
            : "text-slate-900"
        }`}
      >
        {money(value)}
      </span>
    </div>
  );
}
