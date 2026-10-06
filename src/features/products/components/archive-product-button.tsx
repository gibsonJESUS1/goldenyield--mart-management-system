"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ArchiveProductButtonProps = {
  productId: string;
  productName: string;
};

export default function ArchiveProductButton({
  productId,
  productName,
}: ArchiveProductButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    const confirmed = window.confirm(
      `Archive "${productName}"?\n\n` +
        "The product will disappear from active products and cannot be sold. " +
        "Its sales, stock history, cost history, and other records will be preserved.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/products/${productId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to archive product",
        );
      }

      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to archive product",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={loading}
      className="text-sm font-medium text-amber-600 hover:underline disabled:opacity-60"
    >
      {loading
        ? "Archiving..."
        : "Archive"}
    </button>
  );
}