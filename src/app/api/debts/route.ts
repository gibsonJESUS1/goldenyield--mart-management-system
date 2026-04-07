import { NextResponse } from "next/server";
import { createManualDebt, getDebts } from "@/lib/db/debt";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function resolveRange(searchParams: URLSearchParams) {
  const range = searchParams.get("range");

  if (range === "today") {
    return getTodayRange();
  }

  if (range === "week") {
    return getWeekRange();
  }

  if (range === "month") {
    return getMonthRange();
  }

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  return {
    start: startDate ? new Date(startDate) : undefined,
    end: endDate ? new Date(endDate) : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { start, end } = resolveRange(searchParams);

    const debts = await getDebts({
      startDate: start,
      endDate: end,
    });

    const normalized = debts.map((debt) => ({
      id: debt.id,
      customerName: debt.customerName,
      phone: debt.phone,
      note: debt.note,
      balance: Number(debt.balance),
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,
      transactions: debt.transactions.map((transaction) => ({
        id: transaction.id,
        customerDebtId: transaction.customerDebtId,
        saleId: transaction.saleId,
        type: transaction.type,
        amount: Number(transaction.amount),
        description: transaction.description,
        reference: transaction.reference,
        createdAt: transaction.createdAt,
      })),
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("GET /api/debts error:", error);

    return NextResponse.json(
      { message: "Failed to load debts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const customerName =
      typeof body.customerName === "string" ? body.customerName.trim() : "";
    const amount = Number(body.amount);
    const phone =
      typeof body.phone === "string" ? body.phone.trim() : undefined;
    const note = typeof body.note === "string" ? body.note.trim() : undefined;
    const reference =
      typeof body.reference === "string" ? body.reference.trim() : undefined;
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : undefined;

    if (!customerName) {
      return NextResponse.json(
        { message: "Customer name is required" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    const debt = await createManualDebt({
      customerName,
      amount,
      phone,
      note,
      reference,
      description,
    });

    if (!debt) {
      return NextResponse.json(
        { message: "Failed to create debt" },
        { status: 500 },
      );
    }

    const normalized = {
      id: debt.id,
      customerName: debt.customerName,
      phone: debt.phone,
      note: debt.note,
      balance: Number(debt.balance),
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,
      transactions: debt.transactions.map((transaction) => ({
        id: transaction.id,
        customerDebtId: transaction.customerDebtId,
        saleId: transaction.saleId,
        type: transaction.type,
        amount: Number(transaction.amount),
        description: transaction.description,
        reference: transaction.reference,
        createdAt: transaction.createdAt,
      })),
    };

    return NextResponse.json(
      {
        message: "Debt created successfully",
        debt: normalized,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/debts error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to create debt",
      },
      { status: 500 },
    );
  }
}
