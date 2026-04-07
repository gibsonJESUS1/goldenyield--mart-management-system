import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreatePurchaseInput } from "@/lib/validations/purchase";

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

export async function getPurchases() {
  return prisma.purchase.findMany({
    include: {
      items: {
        include: {
          product: {
            include: {
              owner: true,
              category: true,
              unit: true,
            },
          },
        },
      },
    },
    orderBy: {
      purchasedAt: "desc",
    },
  });
}

export async function getPurchaseById(id: string) {
  return prisma.purchase.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            include: {
              owner: true,
              category: true,
              unit: true,
            },
          },
        },
      },
    },
  });
}

export async function createPurchase(input: CreatePurchaseInput) {
  const productIds = [...new Set(input.items.map((item) => item.productId))];

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      name: true,
      stock: true,
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const item of input.items) {
    if (!productMap.has(item.productId)) {
      throw new Error(`Product not found: ${item.productId}`);
    }
  }

  const totalAmountNumber = input.items.reduce((sum, item) => {
    return sum + item.quantityInBaseUnit * item.unitCostPrice;
  }, 0);

  return prisma.$transaction(
    async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          reference: input.reference || null,
          supplierName: input.supplierName || null,
          note: input.note || null,
          purchasedAt:
            input.purchasedAt && input.purchasedAt.trim() !== ""
              ? new Date(input.purchasedAt)
              : new Date(),
          totalAmount: toDecimal(totalAmountNumber),
        },
      });

      for (const item of input.items) {
        const lineTotalNumber = item.quantityInBaseUnit * item.unitCostPrice;

        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            quantityInBaseUnit: item.quantityInBaseUnit,
            unitCostPrice: toDecimal(item.unitCostPrice),
            lineTotal: toDecimal(lineTotalNumber),
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantityInBaseUnit,
            },
            currentCostPrice: toDecimal(item.unitCostPrice),
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "IN",
            quantity: item.quantityInBaseUnit,
            note: `Purchase stock-in${input.reference ? ` (${input.reference})` : ""}`,
          },
        });
      }

      return tx.purchase.findUnique({
        where: { id: purchase.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  owner: true,
                  category: true,
                  unit: true,
                },
              },
            },
          },
        },
      });
    },
    {
      maxWait: 15000,
      timeout: 20000,
    },
  );
}
