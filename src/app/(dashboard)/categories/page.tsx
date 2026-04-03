"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive?: boolean;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function StatusBadge({ isActive }: { isActive?: boolean }) {
  return isActive === false ? (
    <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
      Inactive
    </span>
  ) : (
    <span className="inline-flex rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
      Active
    </span>
  );
}
export const dynamic = "force-dynamic";
export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCategories() {
    try {
      setLoading(true);

      const res = await fetch("/api/categories", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data: Category[] = await res.json();
      setCategories(data);
    } catch (error) {
      console.error(error);
      alert("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleAddCategory() {
    const name = prompt("Category name?");
    if (!name) return;

    const suggestedSlug = slugify(name);
    const slug = prompt("Category slug?", suggestedSlug);
    if (!slug) return;

    const description = prompt("Category description?") ?? "";

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug: slugify(slug),
          description,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create category");
      }

      await loadCategories();
    } catch (error) {
      console.error(error);
      alert("Failed to create category");
    }
  }

  async function handleEditCategory(category: Category) {
    const name = prompt("Edit category name", category.name);
    if (!name) return;

    const slug = prompt("Edit category slug", category.slug);
    if (!slug) return;

    const description =
      prompt("Edit category description", category.description ?? "") ?? "";

    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug: slugify(slug),
          description,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update category");
      }

      await loadCategories();
    } catch (error) {
      console.error(error);
      alert("Failed to update category");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Categories
        </h1>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500 sm:p-6">
          Loading categories...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Categories
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">
            Manage product categories from the database.
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <button
            onClick={handleAddCategory}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 sm:w-auto"
          >
            + Add Category
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm sm:p-10">
          No categories yet
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="break-words text-base font-semibold text-slate-900">
                      {category.name}
                    </h2>
                    <StatusBadge isActive={category.isActive} />
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="break-all">
                      <span className="font-medium text-slate-800">Slug:</span>{" "}
                      {category.slug}
                    </p>

                    <p className="break-words">
                      <span className="font-medium text-slate-800">
                        Description:
                      </span>{" "}
                      {category.description || "—"}
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="w-full rounded-xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Edit Category
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tablet/Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="w-full overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {category.name}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        <span className="break-all">{category.slug}</span>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        <span className="break-words">
                          {category.description || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge isActive={category.isActive} />
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-sm font-medium text-emerald-600 hover:underline"
                        >
                          Edit
                        </button>
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