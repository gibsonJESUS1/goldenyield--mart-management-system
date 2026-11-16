"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type ProductOption = {
  id: string;
  name: string;
  active: boolean;
};

type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  amount: number;
  spentAt: string;
  productId: string | null;
  productName: string | null;
  note: string | null;
};

const categories = [
  "Transport",
  "Fuel / Generator",
  "Electricity",
  "Staff / Wages",
  "Delivery",
  "Packaging",
  "Repairs / Maintenance",
  "Rent",
  "Market / Loading",
  "Spoilage / Loss",
  "Other",
];

function localDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function money(value: number) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function expenseDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ExpensesManager() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [spentDate, setSpentDate] = useState(localDateInputValue);
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [productId, setProductId] = useState("");
  const [note, setNote] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [productsResponse, expensesResponse] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/expenses?take=200", { cache: "no-store" }),
      ]);

      if (!productsResponse.ok || !expensesResponse.ok) {
        throw new Error("Failed to load products or expenses.");
      }

      const productsData = (await productsResponse.json()) as ProductOption[];
      const expensesData = (await expensesResponse.json()) as ExpenseRow[];

      setProducts(productsData);
      setExpenses(expensesData);
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load expenses.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const todayKey = localDateInputValue();

  const todayTotal = useMemo(
    () =>
      expenses
        .filter((item) => expenseDateKey(item.spentAt) === todayKey)
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [expenses, todayKey],
  );

  const visibleMonthKey = todayKey.slice(0, 7);
  const monthTotal = useMemo(
    () =>
      expenses
        .filter((item) => expenseDateKey(item.spentAt).startsWith(visibleMonthKey))
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [expenses, visibleMonthKey],
  );

  async function saveExpense(event: FormEvent) {
    event.preventDefault();
    setError("");

    const parsedAmount = Number(amount);

    if (!description.trim()) {
      setError("Enter what the money was spent on.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an expense amount greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spentDate,
          category,
          description: description.trim(),
          amount: parsedAmount,
          productId: productId || null,
          note: note.trim() || null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save expense.");
      }

      setDescription("");
      setAmount("");
      setProductId("");
      setNote("");
      await loadData();
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save expense.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense(id: string) {
    if (!window.confirm("Delete this expense entry?")) return;

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete expense.");
      }

      setExpenses((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      console.error(deleteError);
      alert(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete expense.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Record daily operating expenses so net profit is based on more than
          product cost alone.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Today&apos;s Expenses</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {money(todayTotal)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">This Month</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {money(monthTotal)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Add Expense</h2>
        <p className="mt-1 text-sm text-slate-500">
          Link an expense to a product only when that expense belongs directly
          to that product. Leave it as General Business for shared shop costs.
        </p>

        <form onSubmit={saveExpense} className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Date">
            <input
              type="date"
              value={spentDate}
              onChange={(event) => setSpentDate(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </Field>

          <Field label="Category">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="What was paid for?">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Generator fuel"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </Field>

          <Field label="Amount (₦)">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 5000"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </Field>

          <Field label="Product (Optional)">
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="">General Business Expense</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}{product.active ? "" : " (Archived)"}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Note (Optional)">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional details"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </Field>

          {error ? (
            <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Expenses</h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest recorded business expenditure.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No expenses recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Description</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 text-right font-medium">Amount</th>
                  <th className="px-3 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3 text-slate-600">
                      {displayDate(item.spentAt)}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900">
                        {item.description}
                      </p>
                      {item.note ? (
                        <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{item.category}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {item.productName ?? "General Business"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">
                      {money(item.amount)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void removeExpense(item.id)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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
