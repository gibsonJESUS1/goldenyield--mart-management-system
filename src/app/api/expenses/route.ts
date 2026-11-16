import { NextResponse } from "next/server";
import { createExpense, getExpenses } from "@/lib/db/expenses";

function parseOptionalDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeExpense(expense: Awaited<ReturnType<typeof getExpenses>>[number]) {
  return {
    id: expense.id,
    description: expense.description,
    category: expense.category,
    amount: Number(expense.amount),
    spentAt: expense.spentAt,
    productId: expense.productId,
    productName: expense.product?.name ?? null,
    note: expense.note,
    createdAt: expense.createdAt,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDate = parseOptionalDate(url.searchParams.get("startDate"));
    const endDate = parseOptionalDate(url.searchParams.get("endDate"));
    const productId = url.searchParams.get("productId") || undefined;
    const take = Number(url.searchParams.get("take") || 200);

    const expenses = await getExpenses({
      startDate,
      endDate,
      productId,
      take: Number.isFinite(take) ? take : 200,
    });

    return NextResponse.json(expenses.map(normalizeExpense));
  } catch (error) {
    console.error("GET /api/expenses error:", error);
    return NextResponse.json(
      { error: "Failed to load expenses." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      description?: string;
      category?: string;
      amount?: number;
      spentDate?: string;
      productId?: string | null;
      note?: string | null;
    };

    const description = body.description?.trim() ?? "";
    const category = body.category?.trim() ?? "";
    const amount = Number(body.amount);

    if (!description) {
      return NextResponse.json(
        { error: "Expense description is required." },
        { status: 400 },
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "Expense category is required." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Expense amount must be greater than zero." },
        { status: 400 },
      );
    }

    if (!body.spentDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.spentDate)) {
      return NextResponse.json(
        { error: "Choose a valid expense date." },
        { status: 400 },
      );
    }

    const spentAt = new Date(`${body.spentDate}T12:00:00+01:00`);

    if (Number.isNaN(spentAt.getTime())) {
      return NextResponse.json(
        { error: "Choose a valid expense date." },
        { status: 400 },
      );
    }

    const expense = await createExpense({
      description,
      category,
      amount,
      spentAt,
      productId: body.productId || null,
      note: body.note || null,
    });

    return NextResponse.json(
      {
        id: expense.id,
        description: expense.description,
        category: expense.category,
        amount: Number(expense.amount),
        spentAt: expense.spentAt,
        productId: expense.productId,
        productName: expense.product?.name ?? null,
        note: expense.note,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save expense.",
      },
      { status: 500 },
    );
  }
}
