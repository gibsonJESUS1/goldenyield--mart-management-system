import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  StockMovementType,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const execute = process.argv.includes("--execute");

  console.log("");
  console.log("Golden Yield Inventory Reset");
  console.log("============================");
  console.log("");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      stock: true,
      active: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const activeProducts = products.filter(
    (product) => product.active,
  );

  const productsWithStock = products.filter(
    (product) => product.stock !== 0,
  );

  const totalStock = productsWithStock.reduce(
    (sum, product) => sum + product.stock,
    0,
  );

  console.log(`Total products: ${products.length}`);
  console.log(`Active products: ${activeProducts.length}`);
  console.log(
    `Products with stock: ${productsWithStock.length}`,
  );
  console.log(`Total recorded base stock: ${totalStock}`);
  console.log("");

  if (!execute) {
    console.log("PREVIEW ONLY — nothing has been changed.");
    console.log("");
    console.log(
      "When you are ready to perform the reset, run:",
    );
    console.log(
      "npx tsx scripts/reset-inventory.ts --execute",
    );
    console.log("");

    return;
  }

  console.log("EXECUTING LIVE INVENTORY RESET...");
  console.log("");

  const movementData = productsWithStock.map(
    (product) => ({
      productId: product.id,

      type:
        product.stock > 0
          ? StockMovementType.OUT
          : StockMovementType.IN,

      quantity: Math.abs(product.stock),

      note: "Store inventory reset before new stock count",
    }),
  );

  const result = await prisma.$transaction(
    async (tx) => {
      let movementsCreated = 0;

      if (movementData.length > 0) {
        const movementResult =
          await tx.stockMovement.createMany({
            data: movementData,
          });

        movementsCreated = movementResult.count;
      }

      const productResult =
        await tx.product.updateMany({
          data: {
            stock: 0,
            active: false,
          },
        });

      return {
        movementsCreated,
        productsUpdated: productResult.count,
      };
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );

  console.log("RESET COMPLETED SUCCESSFULLY");
  console.log("============================");
  console.log(
    `Products reset: ${result.productsUpdated}`,
  );
  console.log(
    `Stock movements recorded: ${result.movementsCreated}`,
  );
  console.log("");
  console.log("All products now have:");
  console.log("stock = 0");
  console.log("active = false");
  console.log("");
  console.log(
    "Sales, debts, purchases and historical records were preserved.",
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error("Inventory reset failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });