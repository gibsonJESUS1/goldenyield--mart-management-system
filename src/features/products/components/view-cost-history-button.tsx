"use client";

import { useState } from "react";

type HistoryItem = {
  id: string;
  oldCostPrice: number | null;
  newCostPrice: number;
  changeType: string;
  note?: string | null;
  createdAt: string;
};

type Props = {
  productId: string;
  productName: string;
};

export default function ViewCostHistoryButton({
  productId,
  productName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/products/${productId}/cost-history`,
      );

      const json = await res.json();
      setData(json);
    } catch {
      alert("Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    setOpen(true);
    await loadData();
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-100"
      >
        Cost History
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl">
            <h2 className="text-lg font-bold">Cost History</h2>
            <p className="text-sm text-slate-500">{productName}</p>

            <div className="mt-4 max-h-[400px] overflow-y-auto space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : data.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No history yet
                </p>
              ) : (
                data.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-3 text-sm"
                  >
                    <p>
                      <b>New:</b> ₦{item.newCostPrice.toLocaleString()}
                    </p>

                    <p>
                      <b>Old:</b>{" "}
                      {item.oldCostPrice != null
                        ? `₦${item.oldCostPrice.toLocaleString()}`
                        : "-"}
                    </p>

                    <p>
                      <b>Type:</b> {item.changeType}
                    </p>

                    {item.note && (
                      <p>
                        <b>Note:</b> {item.note}
                      </p>
                    )}

                    <p className="text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}