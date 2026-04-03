import DataTable from "@/components/ui/data-table";
import SummaryCard from "@/components/shared/summary-card";
import RestockProductButton from "@/features/products/components/restock-product-button";
import { getProducts } from "@/lib/db/product";

export const dynamic = "force-dynamic";

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  ownerName: string;
  unit: string;
  stock: number;
  lowStock: number;
  price: number;
};

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

async function getInventoryItems(): Promise<InventoryItem[]> {
  const products = await getProducts();

  return products.map((product) => {
    const defaultSaleUnit =
      product.saleUnits.find((unit) => unit.isDefault) ?? product.saleUnits[0];

    return {
      id: product.id,
      name: product.name,
      category: product.category.name,
      ownerName: product.owner.name,
      unit: product.unit.name,
      stock: product.stock,
      lowStock: product.lowStock,
      price: defaultSaleUnit ? Number(defaultSaleUnit.sellingPrice) : 0,
    };
  });
}

export default async function InventoryPage() {
  const items = await getInventoryItems();

  const totalItems = items.length;
  const lowStockItems = items.filter(
    (item) => item.stock > 0 && item.stock <= item.lowStock
  ).length;
  const outOfStockItems = items.filter((item) => item.stock === 0).length;
  const stockValue = items.reduce((sum, item) => sum + item.stock * item.price, 0);

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

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm sm:p-10">
          No inventory items found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.map((item) => (
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
                      <span className="font-medium text-slate-800">
                        Low Stock Threshold:
                      </span>{" "}
                      {item.lowStock}
                    </p>
                  </div>

                  <div className="pt-1">
                    <RestockProductButton
                      productId={item.id}
                      productName={item.name}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <DataTable
              data={items}
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
                    <RestockProductButton
                      productId={row.id}
                      productName={row.name}
                    />
                  ),
                },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
} 