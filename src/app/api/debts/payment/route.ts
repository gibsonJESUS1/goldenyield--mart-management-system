import { NextResponse } from "next/server";
import { recordDebtPayment } from "@/lib/db/debt";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customerName: string;
      amount: number;
    };

    if (
      !body.customerName ||
      typeof body.amount !== "number" ||
      body.amount <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid payment payload" },
        { status: 400 },
      );
    }

    const updatedDebt = await recordDebtPayment(body.customerName, body.amount);

    return NextResponse.json({
      id: updatedDebt.id,
      customerName: updatedDebt.customerName,
      totalDebt: Number(updatedDebt.totalDebt),
      createdAt: updatedDebt.createdAt,
      updatedAt: updatedDebt.updatedAt,
    });
  } catch (error) {
    console.error("POST /api/debts/payment error:", error);
    return NextResponse.json(
      { error: "Failed to record debt payment" },
      { status: 500 },
    );
  }
}
