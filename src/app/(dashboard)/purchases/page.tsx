import { PurchaseForm } from "@/features/purchases/components/purchase-form";
import { PurchaseHistoryTable } from "@/features/purchases/components/purchase-history-table";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const [products, purchases] = await Promise.all([
    prisma.product.findMany({
      where: {
        active: true,
      },
      include: {
        unit: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.purchase.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        purchasedAt: "desc",
      },
    }),
  ]);

  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
    unitName: product.unit.name,
    stock: product.stock,
    currentCostPrice:
      product.currentCostPrice != null ? Number(product.currentCostPrice) : null,
  }));

  const normalizedPurchases = purchases.map((purchase) => ({
    id: purchase.id,
    reference: purchase.reference,
    supplierName: purchase.supplierName,
    totalAmount: Number(purchase.totalAmount),
    purchasedAt: purchase.purchasedAt,
    items: purchase.items.map((item) => ({
      id: item.id,
      productName: item.product.name,
      quantityInBaseUnit: item.quantityInBaseUnit,
      unitCostPrice: Number(item.unitCostPrice),
      lineTotal: Number(item.lineTotal),
    })),
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
        <p className="mt-1 text-sm text-gray-600">
          Record stock purchases, update cost price, and keep purchase history.
        </p>
      </div>

      <PurchaseForm products={productOptions} />

      <PurchaseHistoryTable purchases={normalizedPurchases} />
    </div>
  );
}