import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  DebtTransactionType,
  PrismaClient,
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
  console.log("Golden Yield Debt Reset");
  console.log("=======================");
  console.log("");

  const debts = await prisma.customerDebt.findMany({
    where: {
      balance: {
        gt: 0,
      },
    },
    select: {
      id: true,
      customerName: true,
      balance: true,
    },
    orderBy: {
      customerName: "asc",
    },
  });

  const totalOutstanding = debts.reduce(
    (sum, debt) => sum + Number(debt.balance),
    0,
  );

  console.log(`Customers with outstanding debt: ${debts.length}`);
  console.log(
    `Total outstanding debt: ₦${totalOutstanding.toLocaleString()}`,
  );
  console.log("");

  if (debts.length === 0) {
    console.log("There are no outstanding debts to clear.");
    return;
  }

  if (!execute) {
    console.log("PREVIEW ONLY — no debt has been changed.");
    console.log("");
    console.log("Customers to be cleared:");

    for (const debt of debts) {
      console.log(
        `- ${debt.customerName}: ₦${Number(
          debt.balance,
        ).toLocaleString()}`,
      );
    }

    console.log("");
    console.log("To execute the reset, run:");
    console.log("npx tsx scripts/reset-debts.ts --execute");
    return;
  }

  console.log("CLEARING LIVE DEBT BALANCES...");
  console.log("");

  const adjustmentTransactions = debts.map((debt) => ({
    customerDebtId: debt.id,
    type: DebtTransactionType.ADJUSTMENT_DECREASE,
    amount: debt.balance,
    description:
      "Outstanding debt cleared during Golden Yield store reset",
    reference: "STORE-RESET",
  }));

  const result = await prisma.$transaction(
    async (tx) => {
      const transactionResult =
        await tx.debtTransaction.createMany({
          data: adjustmentTransactions,
        });

      const debtResult = await tx.customerDebt.updateMany({
        where: {
          balance: {
            gt: 0,
          },
        },
        data: {
          balance: 0,
        },
      });

      return {
        transactionsCreated: transactionResult.count,
        debtsCleared: debtResult.count,
      };
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );

  console.log("DEBT RESET COMPLETED");
  console.log("====================");
  console.log(`Debt accounts cleared: ${result.debtsCleared}`);
  console.log(
    `Adjustment records created: ${result.transactionsCreated}`,
  );
  console.log("");
  console.log(
    `₦${totalOutstanding.toLocaleString()} in old outstanding debt was reset to ₦0.`,
  );
  console.log("");
  console.log("Historical debt transactions were preserved.");
}

main()
  .catch((error) => {
    console.error("");
    console.error("Debt reset failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });