import { prisma } from "@/lib/prisma";

type DebtDateFilter = {
  startDate?: Date;
  endDate?: Date;
};

function normalizeCustomerName(customerName: string) {
  return customerName.trim().replace(/\s+/g, " ");
}

function assertValidAmount(amount: number, label = "Amount") {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }
}

export async function addDebtFromSale(customerName: string, amount: number) {
  const normalizedCustomerName = normalizeCustomerName(customerName);
  assertValidAmount(amount);

  if (!normalizedCustomerName) {
    throw new Error("Customer name is required");
  }

  return prisma.$transaction(async (tx) => {
    const existingDebt = await tx.customerDebt.findUnique({
      where: { customerName: normalizedCustomerName },
    });

    const customerDebt = existingDebt
      ? await tx.customerDebt.update({
          where: { id: existingDebt.id },
          data: {
            totalDebt: {
              increment: amount,
            },
          },
        })
      : await tx.customerDebt.create({
          data: {
            customerName: normalizedCustomerName,
            totalDebt: amount,
          },
        });

    await tx.debtTransaction.create({
      data: {
        customerDebtId: customerDebt.id,
        type: "sale",
        amount,
        note: "Sale on credit",
      },
    });

    return customerDebt;
  });
}

export async function recordDebtPayment(customerName: string, amount: number) {
  const normalizedCustomerName = normalizeCustomerName(customerName);
  assertValidAmount(amount);

  if (!normalizedCustomerName) {
    throw new Error("Customer name is required");
  }

  return prisma.$transaction(async (tx) => {
    const customerDebt = await tx.customerDebt.findUnique({
      where: { customerName: normalizedCustomerName },
    });

    if (!customerDebt) {
      throw new Error("Customer debt not found");
    }

    const currentDebt = Number(customerDebt.totalDebt);

    if (currentDebt <= 0) {
      throw new Error("This customer has no outstanding debt");
    }

    const paymentApplied = Math.min(currentDebt, amount);
    const newBalance = Math.max(currentDebt - paymentApplied, 0);

    const updated = await tx.customerDebt.update({
      where: { id: customerDebt.id },
      data: {
        totalDebt: newBalance,
      },
    });

    await tx.debtTransaction.create({
      data: {
        customerDebtId: customerDebt.id,
        type: "payment",
        amount: paymentApplied,
        note:
          paymentApplied < amount
            ? `Customer payment (applied ₦${paymentApplied.toLocaleString()} from ₦${amount.toLocaleString()})`
            : "Customer payment",
      },
    });

    return updated;
  });
}

export async function adjustDebt(
  customerName: string,
  amount: number,
  mode: "increase" | "decrease",
  note?: string,
) {
  const normalizedCustomerName = normalizeCustomerName(customerName);
  assertValidAmount(amount, "Adjustment amount");

  if (!normalizedCustomerName) {
    throw new Error("Customer name is required");
  }

  return prisma.$transaction(async (tx) => {
    const customerDebt = await tx.customerDebt.findUnique({
      where: { customerName: normalizedCustomerName },
    });

    if (!customerDebt) {
      throw new Error("Customer debt not found");
    }

    const currentDebt = Number(customerDebt.totalDebt);

    const newBalance =
      mode === "increase"
        ? currentDebt + amount
        : Math.max(currentDebt - amount, 0);

    const updated = await tx.customerDebt.update({
      where: { id: customerDebt.id },
      data: {
        totalDebt: newBalance,
      },
    });

    await tx.debtTransaction.create({
      data: {
        customerDebtId: customerDebt.id,
        type: "adjustment",
        amount,
        note:
          note?.trim() ||
          (mode === "increase"
            ? "Manual debt increase"
            : "Manual debt decrease"),
      },
    });

    return updated;
  });
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
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ totalDebt: "desc" }, { customerName: "asc" }],
  });
}

export async function getDebtByCustomerName(customerName: string) {
  const normalizedCustomerName = normalizeCustomerName(customerName);

  if (!normalizedCustomerName) {
    return null;
  }

  return prisma.customerDebt.findUnique({
    where: {
      customerName: normalizedCustomerName,
    },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}
