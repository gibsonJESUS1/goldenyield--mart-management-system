"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type RestoreProductButtonProps = {
  productId: string;
  productName: string;
};

type RestoreResponse = {
  success?: boolean;

  error?: string;

  code?: string;

  warnings?: string[];
};

export default function RestoreProductButton({
  productId,
  productName,
}: RestoreProductButtonProps) {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function handleRestore() {
    const confirmed =
      window.confirm(
        `Restore "${productName}"?\n\n` +
          "The existing product will become active again. " +
          "Its previous sales and history will remain unchanged.",
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `/api/products/${productId}/restore`,
          {
            method: "POST",
          },
        );

      const data =
        (await response
          .json()
          .catch(
            () => null,
          )) as RestoreResponse | null;

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to restore product",
        );
      }

      router.refresh();

      const warnings =
        data?.warnings ?? [];

      if (
        warnings.length >
        0
      ) {
        alert(
          `"${productName}" has been restored.\n\n` +
            warnings
              .map(
                (warning) =>
                  `• ${warning}`,
              )
              .join("\n"),
        );

        return;
      }

      alert(
        `"${productName}" restored successfully.`,
      );
    } catch (error) {
      console.error(
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to restore product",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={
        handleRestore
      }
      disabled={
        loading
      }
      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading
        ? "Restoring..."
        : "Restore Product"}
    </button>
  );
}