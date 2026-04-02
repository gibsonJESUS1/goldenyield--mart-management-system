import { prisma } from "@/lib/prisma";

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
  });
}

export async function createCategory(
  name: string,
  slug: string,
  description?: string,
) {
  return prisma.category.create({
    data: {
      name,
      slug,
      description,
    },
  });
}

export async function updateCategory(
  id: string,
  name: string,
  slug: string,
  description?: string,
) {
  return prisma.category.update({
    where: { id },
    data: {
      name,
      slug,
      description,
    },
  });
}

export async function deleteCategory(id: string) {
  return prisma.category.delete({
    where: { id },
  });
}
