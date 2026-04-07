"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type TodaySaleItem = {
  id: string;
  productName: string;
  quantity: number;
  quantityInBaseUnit: number;
  unitPrice: number;
  lineTotal: number;
  lineProfit: number;
  saleUnitName: string | null;
  saleId: string;
  customerName: string | null;
  amountPaid: number;
  balance: number;
  saleCreatedAt: string | Date;
};

type TodaySalesTableProps = {
  items: TodaySaleItem[];
};

export function TodaySalesTable({ items }: TodaySalesTableProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 20000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Today’s Sold Items</h2>
        <p className="mt-1 text-sm text-gray-600">
          Auto-refreshes every 20 seconds.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-3 font-medium">Time</th>
              <th className="px-3 py-3 font-medium">Receipt</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Product</th>
              <th className="px-3 py-3 font-medium">Qty</th>
              <th className="px-3 py-3 font-medium">Unit</th>
              <th className="px-3 py-3 font-medium">Unit Price</th>
              <th className="px-3 py-3 font-medium">Total</th>
              <th className="px-3 py-3 font-medium">Profit</th>
              <th className="px-3 py-3 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-gray-500">
                  No sales recorded today.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-3 py-3">
                    {new Date(item.saleCreatedAt).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-3">{item.saleId.slice(0, 8)}</td>
                  <td className="px-3 py-3">{item.customerName || "Walk-in"}</td>
                  <td className="px-3 py-3">{item.productName}</td>
                  <td className="px-3 py-3">{item.quantity}</td>
                  <td className="px-3 py-3">{item.saleUnitName || "Base unit"}</td>
                  <td className="px-3 py-3">
                    {item.unitPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-3 font-medium">
                    {item.lineTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-3">
                    {item.lineProfit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-3">
                    {item.balance.toLocaleString(undefined, {
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