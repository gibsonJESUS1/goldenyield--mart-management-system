import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type DebtDateFilter = {
  startDate?: Date;
  endDate?: Date;
};

type CreateManualDebtInput = {
  customerName: string;
  amount: number;
  phone?: string;
  note?: string;
  reference?: string;
  description?: string;
};

type RecordDebtPaymentInput = {
  customerDebtId: string;
  amount: number;
  note?: string;
  reference?: string;
};

type AdjustDebtInput = {
  customerDebtId: string;
  amount: number;
  direction: "increase" | "decrease";
  note?: string;
  reference?: string;
};

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

export async function getDebts(filters?: DebtDateFilter) {
  return prisma.customerDebt.findMany({
    include: {
      transactions: {
        where:
          filters?.startDate || filters?.endDate
            ? {
                createdAt: {
                  ...(filters.startDate ? { gte: filters.startDate } : {}),
                  ...(filters.endDate ? { lte: filters.endDate } : {}),
                },
              }
            : undefined,
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      balance: "desc",
    },
  });
}

export async function getDebtById(customerDebtId: string) {
  return prisma.customerDebt.findUnique({
    where: { id: customerDebtId },
    include: {
      transactions: {
        include: {
          sale: {
            include: {
              items: {
                include: {
                  product: true,
                  saleUnit: {
                    include: {
                      unit: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function createManualDebt(input: CreateManualDebtInput) {
  const normalizedCustomerName = input.customerName.trim();

  return prisma.$transaction(
    async (tx) => {
      let debt = await tx.customerDebt.findFirst({
        where: {
          customerName: {
            equals: normalizedCustomerName,
            mode: "insensitive",
          },
        },
      });

      if (!debt) {
        debt = await tx.customerDebt.create({
          data: {
            customerName: normalizedCustomerName,
            phone: input.phone?.trim() || null,
            note: input.note?.trim() || null,
            balance: toDecimal(0),
          },
        });
      } else if (input.phone || input.note) {
        debt = await tx.customerDebt.update({
          where: { id: debt.id },
          data: {
            phone: input.phone?.trim() || debt.phone,
            note: input.note?.trim() || debt.note,
          },
        });
      }

      await tx.customerDebt.update({
        where: { id: debt.id },
        data: {
          balance: {
            increment: toDecimal(input.amount),
          },
        },
      });

      await tx.debtTransaction.create({
        data: {
          customerDebtId: debt.id,
          type: "MANUAL_DEBT",
          amount: toDecimal(input.amount),
          description:
            input.description?.trim() ||
            `Manual debt added for ${normalizedCustomerName}`,
          reference: input.reference?.trim() || null,
        },
      });

      return tx.customerDebt.findUnique({
        where: { id: debt.id },
        include: {
          transactions: {
            orderBy: {
              createdAt: "desc",
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

export async function recordDebtPayment(input: RecordDebtPaymentInput) {
  const debt = await prisma.customerDebt.findUnique({
    where: { id: input.customerDebtId },
    select: {
      id: true,
      balance: true,
    },
  });

  if (!debt) {
    throw new Error("Debt record not found");
  }

  const currentBalance = Number(debt.balance);
  const paymentAmount = Number(input.amount);

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  if (paymentAmount > currentBalance) {
    throw new Error(
      `Payment cannot exceed current balance of ${currentBalance.toFixed(2)}`,
    );
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.customerDebt.update({
        where: { id: debt.id },
        data: {
          balance: {
            decrement: toDecimal(paymentAmount),
          },
        },
      });

      await tx.debtTransaction.create({
        data: {
          customerDebtId: debt.id,
          type: "PAYMENT",
          amount: toDecimal(paymentAmount),
          description: input.note?.trim() || "Debt payment received",
          reference: input.reference?.trim() || null,
        },
      });

      return tx.customerDebt.findUnique({
        where: { id: debt.id },
        include: {
          transactions: {
            orderBy: {
              createdAt: "desc",
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

export async function adjustDebt(input: AdjustDebtInput) {
  const debt = await prisma.customerDebt.findUnique({
    where: { id: input.customerDebtId },
    select: {
      id: true,
      customerName: true,
      balance: true,
    },
  });

  if (!debt) {
    throw new Error("Debt record not found");
  }

  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Adjustment amount must be greater than 0");
  }

  if (input.direction === "decrease" && amount > Number(debt.balance)) {
    throw new Error("Adjustment cannot reduce below zero balance");
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.customerDebt.update({
        where: { id: debt.id },
        data: {
          balance:
            input.direction === "increase"
              ? { increment: toDecimal(amount) }
              : { decrement: toDecimal(amount) },
        },
      });

      await tx.debtTransaction.create({
        data: {
          customerDebtId: debt.id,
          type:
            input.direction === "increase"
              ? "ADJUSTMENT_INCREASE"
              : "ADJUSTMENT_DECREASE",
          amount: toDecimal(amount),
          description:
            input.note?.trim() ||
            `Debt adjustment (${input.direction}) for ${debt.customerName}`,
          reference: input.reference?.trim() || null,
        },
      });

      return tx.customerDebt.findUnique({
        where: { id: debt.id },
        include: {
          transactions: {
            orderBy: {
              createdAt: "desc",
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

export async function getDebtSummary() {
  const debts = await prisma.customerDebt.findMany({
    select: {
      id: true,
      customerName: true,
      balance: true,
    },
    orderBy: {
      balance: "desc",
    },
  });

  const totalOutstanding = debts.reduce(
    (sum, item) => sum + Number(item.balance),
    0,
  );

  return {
    totalOutstanding,
    customerCount: debts.length,
    debts,
  };
}

export async function getCustomerDebtById(id: string) {
  return prisma.customerDebt.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
