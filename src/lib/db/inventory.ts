import { prisma } from "@/lib/prisma";

type RestockProductInput = {
  productId: string;
  quantity: number;
  note?: string;
};

type AdjustProductInput = {
  productId: string;
  quantity: number;
  note?: string;
};

export async function restockProduct(input: RestockProductInput) {
  if (!input.productId) {
    throw new Error("Product is required");
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error("Restock quantity must be a positive whole number");
  }

  const existingProduct = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!existingProduct) {
    throw new Error("Product not found");
  }

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId: input.productId,
        type: "restock",
        quantity: input.quantity,
        note: input.note?.trim() || "Manual restock",
      },
    }),
    prisma.product.update({
      where: { id: input.productId },
      data: {
        stock: {
          increment: input.quantity,
        },
      },
    }),
  ]);

  const updatedProduct = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      name: true,
      stock: true,
    },
  });

  if (!updatedProduct) {
    throw new Error("Failed to load updated product");
  }

  return updatedProduct;
}

export async function adjustProductStock(input: AdjustProductInput) {
  if (!input.productId) {
    throw new Error("Product is required");
  }

  if (!Number.isInteger(input.quantity) || input.quantity === 0) {
    throw new Error("Adjustment quantity must be a non-zero whole number");
  }

  return prisma.$transaction(
    async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
        select: {
          id: true,
          name: true,
          stock: true,
        },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      const nextStock = product.stock + input.quantity;

      if (nextStock < 0) {
        throw new Error(
          `Adjustment would make stock negative for ${product.name}. Current stock is ${product.stock}.`,
        );
      }

      await tx.stockMovement.create({
        data: {
          productId: input.productId,
          type: "adjustment",
          quantity: input.quantity,
          note: input.note?.trim() || "Manual stock adjustment",
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: input.productId },
        data: {
          stock: {
            increment: input.quantity,
          },
        },
        select: {
          id: true,
          name: true,
          stock: true,
        },
      });

      return updatedProduct;
    },
    {
      maxWait: 10000,
      timeout: 15000,
    },
  );
}
