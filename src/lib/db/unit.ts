import { prisma } from "@/lib/prisma";

export async function getUnits() {
  return prisma.productUnit.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createUnit(name: string, symbol?: string) {
  return prisma.productUnit.create({
    data: {
      name,
      symbol,
    },
  });
}

export async function updateUnit(id: string, name: string, symbol?: string) {
  return prisma.productUnit.update({
    where: { id },
    data: {
      name,
      symbol,
    },
  });
}
