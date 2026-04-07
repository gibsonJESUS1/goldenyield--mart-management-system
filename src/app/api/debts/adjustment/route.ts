import { NextResponse } from "next/server";
import { adjustDebt } from "@/lib/db/debt";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const customerDebtId =
      typeof body.customerDebtId === "string" ? body.customerDebtId.trim() : "";
    const amount = Number(body.amount);
    const direction =
      body.direction === "increase" || body.direction === "decrease"
        ? body.direction
        : null;
    const note = typeof body.note === "string" ? body.note.trim() : undefined;
    const reference =
      typeof body.reference === "string" ? body.reference.trim() : undefined;

    if (!customerDebtId) {
      return NextResponse.json(
        { message: "customerDebtId is required" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    if (!direction) {
      return NextResponse.json(
        { message: "direction must be 'increase' or 'decrease'" },
        { status: 400 },
      );
    }

    const debt = await adjustDebt({
      customerDebtId,
      amount,
      direction,
      note,
      reference,
    });

    if (!debt) {
      return NextResponse.json(
        { message: "Failed to adjust debt" },
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
        message: "Debt adjusted successfully",
        debt: normalized,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/debts/adjustment error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to adjust debt",
      },
      { status: 500 },
    );
  }
}
