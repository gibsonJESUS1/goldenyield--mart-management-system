import DataTable from "@/components/ui/data-table";
import SummaryCard from "@/components/shared/summary-card";
import InventoryActionButton from "@/features/products/components/inventory-action-button";
import UpdateCostPriceButton from "@/features/products/components/update-cost-price-button";
import ViewCostHistoryButton from "@/features/products/components/view-cost-history-button";
import { getProducts } from "@/lib/db/product";
import BulkStockTakeButton from "@/features/products/components/bulk-stock-take-button";

export const dynamic =
  "force-dynamic";

type InventorySaleUnit = {
  id: string;
  unitName: string;
  quantityInBaseUnit: number;
  sellingPrice: number;
  isDefault: boolean;
  active: boolean;
  priceRules: Array<{
    quantity: number;
    price: number;
    active?: boolean;
  }>;
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  ownerName: string;
  unit: string;
  stock: number;
  lowStock: number;
  price: number;
  currentCostPrice: number;
  saleUnits: InventorySaleUnit[];
};

function getStockBadge(
  stock: number,
  lowStock: number,
) {
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

function getStockText(
  stock: number,
  lowStock: number,
) {
  if (stock === 0) {
    return (
      <span className="font-semibold text-red-600">
        Out
      </span>
    );
  }

  if (stock <= lowStock) {
    return (
      <span className="font-semibold text-amber-600">
        {stock} (Low)
      </span>
    );
  }

  return (
    <span className="font-semibold text-emerald-600">
      {stock}
    </span>
  );
}

async function getInventoryItems(): Promise<
  InventoryItem[]
> {
  const products = (
  await getProducts()
).filter(
  (product) =>
    product.active,
);

  return products.map(
    (product) => {
      const activeSaleUnits =
        product.saleUnits.filter(
          (unit) =>
            unit.active,
        );

      const defaultSaleUnit =
        activeSaleUnits.find(
          (unit) =>
            unit.isDefault,
        ) ??
        activeSaleUnits[0];

      return {
        id:
          product.id,

        name:
          product.name,

        category:
          product.category.name,

        ownerName:
          product.owner.name,

        unit:
          product.unit.name,

        stock:
          product.stock,

        lowStock:
          product.lowStock,

        price:
          defaultSaleUnit
            ? Number(
                defaultSaleUnit.sellingPrice,
              )
            : 0,

        currentCostPrice:
          product.currentCostPrice !=
          null
            ? Number(
                product.currentCostPrice,
              )
            : 0,

        saleUnits:
          activeSaleUnits.map(
            (saleUnit) => ({
              id:
                saleUnit.id,

              unitName:
                saleUnit.unit
                  .name,

              quantityInBaseUnit:
                saleUnit.quantityInBaseUnit,

              sellingPrice:
                Number(
                  saleUnit.sellingPrice,
                ),

              isDefault:
                saleUnit.isDefault,

              active:
                saleUnit.active,

              priceRules:
                saleUnit.priceRules.map(
                  (rule) => ({
                    quantity:
                      rule.quantity,

                    price:
                      Number(
                        rule.price,
                      ),

                    active:
                      rule.active,
                  }),
                ),
            }),
          ),
      };
    },
  );
}

export default async function InventoryPage() {
  const items =
    await getInventoryItems();

  const totalItems =
    items.length;

  const lowStockItems =
    items.filter(
      (item) =>
        item.stock > 0 &&
        item.stock <=
          item.lowStock,
    ).length;

  const outOfStockItems =
    items.filter(
      (item) =>
        item.stock === 0,
    ).length;

  const stockValue =
    items.reduce(
      (sum, item) =>
        sum +
        item.stock *
          item.currentCostPrice,
      0,
    );

  return (
 <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
  <div className="min-w-0">
    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
      Inventory
    </h1>

    <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">
      Monitor stock levels, restock products,
      adjust stock, update cost price, and
      perform physical stock counts.
    </p>
  </div>

  <BulkStockTakeButton
    products={items.map(
      (item) => ({
        id: item.id,
        name: item.name,
        category:
          item.category,
        unit: item.unit,
        stock: item.stock,
      }),
    )}
  />
</div>
  );
}