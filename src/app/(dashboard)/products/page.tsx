import AddProductForm from "@/features/products/components/add-product-form";
import DeleteProductButton from "@/features/products/components/delete-product-button";
import EditProductForm from "@/features/products/components/edit-product-form";
import { getProducts } from "@/lib/db/product";
import RestockProductButton from "@/features/products/components/restock-product-button";

type Product = {
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
  createdAt?: string;
  updatedAt?: string;
  saleUnits: {
    id: string;
    unitId: string;
    unitName: string;
    quantityInBaseUnit: number;
    sellingPrice: number;
    isDefault: boolean;
    active: boolean;
    priceRules?: {
      id?: string;
      quantity: number;
      price: number;
      active: boolean;
    }[];
  }[];
};
export const dynamic = "force-dynamic";

async function getProductsForPage(): Promise<Product[]> {
  const products = await getProducts();

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    ownerId: product.ownerId,
    ownerName: product.owner.name,
    categoryId: product.categoryId,
    category: product.category.name,
    unitId: product.unitId,
    unit: product.unit.name,
    stock: product.stock,
    lowStock: product.lowStock,
    active: product.active,
    createdAt: product.createdAt?.toString(),
    updatedAt: product.updatedAt?.toString(),
    saleUnits: product.saleUnits.map((saleUnit) => ({
      id: saleUnit.id,
      unitId: saleUnit.unitId,
      unitName: saleUnit.unit.name,
      quantityInBaseUnit: saleUnit.quantityInBaseUnit,
      sellingPrice: Number(saleUnit.sellingPrice),
      isDefault: saleUnit.isDefault,
      active: saleUnit.active,
      priceRules: (saleUnit.priceRules ?? []).map((rule) => ({
        id: rule.id,
        quantity: rule.quantity,
        price: Number(rule.price),
        active: rule.active,
      })),
    })),
  }));
}

function getStockTextColor(stock: number, lowStock: number) {
  if (stock === 0) return "text-red-600";
  if (stock <= lowStock) return "text-amber-600";
  return "text-emerald-600";
}

function getStockBadge(stock: number, lowStock: number) {
  if (stock === 0) {
    return (
      <span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
        Out
      </span>
    );
  }

  if (stock <= lowStock) {
    return (
      <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-600">
        Low
      </span>
    );
  }

  return (
    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
      OK
    </span>
  );
}

export default async function ProductsPage() {
  const products = await getProductsForPage();

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Products
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">
            Manage all store items, owners, stock levels, and selling units.
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <AddProductForm />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm sm:p-10">
          No products yet
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {products.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-base font-semibold text-slate-900 break-words">
                        {p.name}
                      </h2>
                      {getStockBadge(p.stock, p.lowStock)}
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-800">Category:</span>{" "}
                        {p.category}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Owner:</span>{" "}
                        {p.ownerName}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Base Unit:</span>{" "}
                        {p.unit}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Stock:</span>{" "}
                        <span className={`font-semibold ${getStockTextColor(p.stock, p.lowStock)}`}>
                          {p.stock}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Low Stock Threshold:</span>{" "}
                        {p.lowStock}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-800">
                      Selling Units
                    </p>

                    {p.saleUnits.length === 0 ? (
                      <span className="text-sm text-slate-400">No selling units</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {p.saleUnits.map((saleUnit) => (
                          <span
                            key={saleUnit.id}
                            className={`rounded-full px-2.5 py-1.5 text-xs leading-5 ${
                              saleUnit.isDefault
                                ? "bg-emerald-50 font-semibold text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {saleUnit.unitName} • ₦{saleUnit.sellingPrice.toLocaleString()} •{" "}
                            {saleUnit.quantityInBaseUnit} base
                            {saleUnit.isDefault ? " • Default" : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <EditProductForm productId={p.id} />
                    <RestockProductButton
                      productId={p.id}
                      productName={p.name}
                    />
                    <DeleteProductButton
                      productId={p.id}
                      productName={p.name}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / tablet table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="w-full overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Base Unit</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Selling Units</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 text-slate-600">{p.category}</td>
                      <td className="px-4 py-3 text-slate-600">{p.ownerName}</td>
                      <td className="px-4 py-3 text-slate-600">{p.unit}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${getStockTextColor(
                            p.stock,
                            p.lowStock
                          )}`}
                        >
                          {p.stock}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {p.saleUnits.length === 0 ? (
                          <span className="text-slate-400">No selling units</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {p.saleUnits.map((saleUnit) => (
                              <span
                                key={saleUnit.id}
                                className={`rounded-full px-2 py-1 text-xs ${
                                  saleUnit.isDefault
                                    ? "bg-emerald-50 font-semibold text-emerald-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {saleUnit.unitName} • ₦{saleUnit.sellingPrice.toLocaleString()}
                                {" • "}
                                {saleUnit.quantityInBaseUnit} base
                                {saleUnit.isDefault ? " • Default" : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">{getStockBadge(p.stock, p.lowStock)}</td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <EditProductForm productId={p.id} />
                          <RestockProductButton
                            productId={p.id}
                            productName={p.name}
                          />
                          <DeleteProductButton
                            productId={p.id}
                            productName={p.name}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}