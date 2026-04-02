import { prisma } from "@/lib/prisma";

type DebtDateFilter = {
  startDate?: Date;
  endDate?: Date;
};

export async function addDebtFromSale(customerName: string, amount: number) {
  if (!customerName || amount <= 0) return;

  let customerDebt = await prisma.customerDebt.findUnique({
    where: { customerName },
  });

  if (!customerDebt) {
    customerDebt = await prisma.customerDebt.create({
      data: {
        customerName,
        totalDebt: amount,
      },
    });
  } else {
    customerDebt = await prisma.customerDebt.update({
      where: { id: customerDebt.id },
      data: {
        totalDebt: Number(customerDebt.totalDebt) + amount,
      },
    });
  }

  await prisma.debtTransaction.create({
    data: {
      customerDebtId: customerDebt.id,
      type: "sale",
      amount,
      note: "Sale on credit",
    },
  });

  return customerDebt;
}

export async function recordDebtPayment(customerName: string, amount: number) {
  const customerDebt = await prisma.customerDebt.findUnique({
    where: { customerName },
  });

  if (!customerDebt) {
    throw new Error("Customer debt not found");
  }

  const newBalance = Math.max(Number(customerDebt.totalDebt) - amount, 0);

  const updated = await prisma.customerDebt.update({
    where: { id: customerDebt.id },
    data: {
      totalDebt: newBalance,
    },
  });

  await prisma.debtTransaction.create({
    data: {
      customerDebtId: customerDebt.id,
      type: "payment",
      amount,
      note: "Customer payment",
    },
  });

  return updated;
}

export async function adjustDebt(
  customerName: string,
  amount: number,
  mode: "increase" | "decrease",
  note?: string,
) {
  const customerDebt = await prisma.customerDebt.findUnique({
    where: { customerName },
  });

  if (!customerDebt) {
    throw new Error("Customer debt not found");
  }

  const current = Number(customerDebt.totalDebt);

  const newBalance =
    mode === "increase" ? current + amount : Math.max(current - amount, 0);

  const updated = await prisma.customerDebt.update({
    where: { id: customerDebt.id },
    data: {
      totalDebt: newBalance,
    },
  });

  await prisma.debtTransaction.create({
    data: {
      customerDebtId: customerDebt.id,
      type: "adjustment",
      amount,
      note:
        note ||
        (mode === "increase" ? "Manual debt increase" : "Manual debt decrease"),
    },
  });

  return updated;
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
    orderBy: { totalDebt: "desc" },
  });
}
