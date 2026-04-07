type PurchaseHistoryItem = {
  id: string;
  reference: string | null;
  supplierName: string | null;
  totalAmount: number;
  purchasedAt: Date | string;
  items: Array<{
    id: string;
    productName: string;
    quantityInBaseUnit: number;
    unitCostPrice: number;
    lineTotal: number;
  }>;
};

type PurchaseHistoryTableProps = {
  purchases: PurchaseHistoryItem[];
};

export function PurchaseHistoryTable({ purchases }: PurchaseHistoryTableProps) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Purchase History</h2>
        <p className="mt-1 text-sm text-gray-600">Recent stock purchases and cost updates.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Reference</th>
              <th className="px-3 py-3 font-medium">Supplier</th>
              <th className="px-3 py-3 font-medium">Items</th>
              <th className="px-3 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  No purchases yet.
                </td>
              </tr>
            ) : (
              purchases.map((purchase) => (
                <tr key={purchase.id} className="border-b align-top">
                  <td className="px-3 py-3">
                    {new Date(purchase.purchasedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-3">{purchase.reference || "—"}</td>
                  <td className="px-3 py-3">{purchase.supplierName || "—"}</td>
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      {purchase.items.map((item) => (
                        <div key={item.id} className="text-xs text-gray-700">
                          {item.productName} — {item.quantityInBaseUnit} ×{" "}
                          {item.unitCostPrice.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold">
                    {purchase.totalAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}