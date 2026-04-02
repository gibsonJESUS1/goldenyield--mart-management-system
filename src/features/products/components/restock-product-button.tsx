"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RestockProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRestock() {
    const quantityText = window.prompt(`Restock quantity for "${productName}"?`);
    if (!quantityText) return;

    const quantityToAdd = Number(quantityText);
    if (!quantityToAdd || quantityToAdd <= 0) {
      alert("Enter a valid quantity");
      return;
    }

    const note = window.prompt("Restock note (optional)") ?? "";

    setLoading(true);

    try {
      const res = await fetch(`/api/products/${productId}/restock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantityToAdd, note }),
      });

      if (!res.ok) {
        throw new Error("Failed to restock product");
      }

      router.refresh();
      alert("Product restocked successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to restock product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRestock}
      disabled={loading}
      className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-60"
    >
      {loading ? "Restocking..." : "Restock"}
    </button>
  );
}