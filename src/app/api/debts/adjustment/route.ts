import { NextResponse } from "next/server";
import { adjustDebt } from "@/lib/db/debt";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customerName: string;
      amount: number;
      mode: "increase" | "decrease";
      note?: string;
    };

    if (
      !body.customerName ||
      typeof body.amount !== "number" ||
      body.amount <= 0 ||
      (body.mode !== "increase" && body.mode !== "decrease")
    ) {
      return NextResponse.json(
        { error: "Invalid adjustment payload" },
        { status: 400 },
      );
    }

    const updatedDebt = await adjustDebt(
      body.customerName,
      body.amount,
      body.mode,
      body.note,
    );

    return NextResponse.json({
      id: updatedDebt.id,
      customerName: updatedDebt.customerName,
      totalDebt: Number(updatedDebt.totalDebt),
      createdAt: updatedDebt.createdAt,
      updatedAt: updatedDebt.updatedAt,
    });
  } catch (error) {
    console.error("POST /api/debts/adjustment error:", error);
    return NextResponse.json(
      { error: "Failed to adjust debt" },
      { status: 500 },
    );
  }
}
