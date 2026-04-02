import { prisma } from "@/lib/prisma";

export type CreatePriceRuleInput = {
  quantity: number;
  price: number;
  active?: boolean;
};

export type CreateProductSaleUnitInput = {
  unitId: string;
  quantityInBaseUnit: number;
  sellingPrice: number;
  isDefault?: boolean;
  active?: boolean;
  priceRules?: CreatePriceRuleInput[];
};

export type CreateProductInput = {
  name: string;
  ownerId: string;
  categoryId: string;
  unitId: string;
  stock: number;
  lowStock: number;
  active?: boolean;
  saleUnits: CreateProductSaleUnitInput[];
};

export type UpdateProductInput = {
  name: string;
  ownerId: string;
  categoryId: string;
  unitId: string;
  stock: number;
  lowStock: number;
  active?: boolean;
  saleUnits: Array<{
    id?: string;
    unitId: string;
    quantityInBaseUnit: number;
    sellingPrice: number;
    isDefault?: boolean;
    active?: boolean;
    priceRules?: CreatePriceRuleInput[];
  }>;
};

export async function getProducts() {
  return prisma.product.findMany({
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
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
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
        take: 20,
      },
    },
  });
}

export async function createProduct(data: CreateProductInput) {
  return prisma.product.create({
    data: {
      name: data.name,
      ownerId: data.ownerId,
      categoryId: data.categoryId,
      unitId: data.unitId,
      stock: data.stock,
      lowStock: data.lowStock,
      active: data.active ?? true,
      saleUnits: {
        create: data.saleUnits.map((saleUnit) => ({
          unitId: saleUnit.unitId,
          quantityInBaseUnit: saleUnit.quantityInBaseUnit,
          sellingPrice: saleUnit.sellingPrice,
          isDefault: saleUnit.isDefault ?? false,
          active: saleUnit.active ?? true,
          priceRules:
            saleUnit.priceRules && saleUnit.priceRules.length > 0
              ? {
                  create: saleUnit.priceRules.map((rule) => ({
                    quantity: rule.quantity,
                    price: rule.price,
                    active: rule.active ?? true,
                  })),
                }
              : undefined,
        })),
      },
      stockMovements:
        data.stock > 0
          ? {
              create: {
                type: "restock",
                quantity: data.stock,
                note: "Initial stock",
              },
            }
          : undefined,
    },
    include: {
      owner: true,
      category: true,
      unit: true,
      saleUnits: {
        include: {
          unit: true,
          priceRules: true,
        },
      },
    },
  });
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  await prisma.productSaleUnitPriceRule.deleteMany({
    where: {
      productSaleUnit: {
        productId: id,
      },
    },
  });

  await prisma.productSaleUnit.deleteMany({
    where: { productId: id },
  });

  return prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      ownerId: data.ownerId,
      categoryId: data.categoryId,
      unitId: data.unitId,
      stock: data.stock,
      lowStock: data.lowStock,
      active: data.active ?? true,
      saleUnits: {
        create: data.saleUnits.map((saleUnit) => ({
          unitId: saleUnit.unitId,
          quantityInBaseUnit: saleUnit.quantityInBaseUnit,
          sellingPrice: saleUnit.sellingPrice,
          isDefault: saleUnit.isDefault ?? false,
          active: saleUnit.active ?? true,
          priceRules:
            saleUnit.priceRules && saleUnit.priceRules.length > 0
              ? {
                  create: saleUnit.priceRules.map((rule) => ({
                    quantity: rule.quantity,
                    price: rule.price,
                    active: rule.active ?? true,
                  })),
                }
              : undefined,
        })),
      },
    },
    include: {
      owner: true,
      category: true,
      unit: true,
      saleUnits: {
        include: {
          unit: true,
          priceRules: true,
        },
      },
    },
  });
}

export async function reduceProductStock(
  productId: string,
  quantityToReduce: number,
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.stock < quantityToReduce) {
    throw new Error("Insufficient stock");
  }

  return prisma.product.update({
    where: { id: productId },
    data: {
      stock: product.stock - quantityToReduce,
      stockMovements: {
        create: {
          type: "sale",
          quantity: quantityToReduce,
          note: "Stock reduced from sale",
        },
      },
    },
  });
}

export async function restockProduct(
  productId: string,
  quantityToAdd: number,
  note?: string,
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (quantityToAdd <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  return prisma.product.update({
    where: { id: productId },
    data: {
      stock: product.stock + quantityToAdd,
      stockMovements: {
        create: {
          type: "restock",
          quantity: quantityToAdd,
          note: note || "Manual restock",
        },
      },
    },
    include: {
      owner: true,
      category: true,
      unit: true,
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

export async function deleteProduct(id: string) {
  return prisma.product.delete({
    where: { id },
  });
}
