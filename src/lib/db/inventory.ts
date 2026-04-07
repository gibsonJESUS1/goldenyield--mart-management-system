import { prisma } from "@/lib/prisma";

type RestockInput = {
  productId: string;
  quantity: number;
  note?: string;
};

type AdjustInventoryInput = {
  productId: string;
  quantity: number;
  note?: string;
};

type InventoryFilters = {
  lowStockOnly?: boolean;
  ownerId?: string;
  categoryId?: string;
};

export async function getInventory(filters?: InventoryFilters) {
  return prisma.product
    .findMany({
      where: {
        ...(filters?.ownerId ? { ownerId: filters.ownerId } : {}),
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
      },
      include: {
        owner: true,
        category: true,
        unit: true,
        saleUnits: {
          include: {
            unit: true,
            priceRules: {
              where: { active: true },
              orderBy: { quantity: "desc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { name: "asc" },
    })
    .then((products) =>
      filters?.lowStockOnly
        ? products.filter((product) => product.stock <= product.lowStock)
        : products,
    );
}

export async function restockInventory(input: RestockInput) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      stock: true,
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId: input.productId,
        type: "IN",
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

  return prisma.product.findUnique({
    where: { id: input.productId },
    include: {
      owner: true,
      category: true,
      unit: true,
      saleUnits: {
        include: {
          unit: true,
          priceRules: {
            where: { active: true },
            orderBy: { quantity: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function adjustInventory(input: AdjustInventoryInput) {
  if (!Number.isFinite(input.quantity) || input.quantity === 0) {
    throw new Error("Quantity cannot be zero");
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      stock: true,
      name: true,
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const absoluteQuantity = Math.abs(input.quantity);
  const isIncrease = input.quantity > 0;

  if (!isIncrease && product.stock < absoluteQuantity) {
    throw new Error(
      `Cannot reduce ${absoluteQuantity}. Available stock is ${product.stock}.`,
    );
  }

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId: input.productId,
        type: isIncrease ? "IN" : "OUT",
        quantity: absoluteQuantity,
        note:
          input.note?.trim() ||
          (isIncrease ? "Manual stock increase" : "Manual stock decrease"),
      },
    }),
    prisma.product.update({
      where: { id: input.productId },
      data: {
        stock: isIncrease
          ? { increment: absoluteQuantity }
          : { decrement: absoluteQuantity },
      },
    }),
  ]);

  return prisma.product.findUnique({
    where: { id: input.productId },
    include: {
      owner: true,
      category: true,
      unit: true,
      saleUnits: {
        include: {
          unit: true,
          priceRules: {
            where: { active: true },
            orderBy: { quantity: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function getStockMovements() {
  return prisma.stockMovement.findMany({
    include: {
      product: {
        include: {
          owner: true,
          category: true,
          unit: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
