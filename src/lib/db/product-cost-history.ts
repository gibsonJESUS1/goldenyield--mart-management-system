import { prisma } from "@/lib/prisma";

export async function getProductCostHistory(productId: string) {
  return prisma.productCostPriceHistory.findMany({
    where: {
      productId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20, // latest 20 changes
  });
}
