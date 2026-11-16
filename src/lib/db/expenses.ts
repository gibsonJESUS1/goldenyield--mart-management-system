import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type ExpenseFilters = {
  startDate?: Date;
  endDate?: Date;
  productId?: string;
  take?: number;
};

export type CreateExpenseInput = {
  description: string;
  category: string;
  amount: number;
  spentAt: Date;
  productId?: string | null;
  note?: string | null;
};

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

export async function getExpenses(filters: ExpenseFilters = {}) {
  return prisma.expense.findMany({
    where: {
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            spentAt: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lt: filters.endDate } : {}),
            },
          }
        : {}),
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(filters.take ?? 200, 1), 500),
  });
}

export async function createExpense(input: CreateExpenseInput) {
  return prisma.expense.create({
    data: {
      description: input.description.trim().replace(/\s+/g, " "),
      category: input.category.trim().replace(/\s+/g, " "),
      amount: toDecimal(input.amount),
      spentAt: input.spentAt,
      productId: input.productId || null,
      note: input.note?.trim() || null,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function deleteExpense(id: string) {
  return prisma.expense.delete({
    where: { id },
  });
}
