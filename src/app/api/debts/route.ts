import { NextResponse } from "next/server";
import { getDebts } from "@/lib/db/debt";

function getDateRange(range: string | null) {
  const now = new Date();

  if (range === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { startDate: start, endDate: end };
  }

  if (range === "7d") {
    const start = new Date();
    start.setDate(now.getDate() - 7);
    return { startDate: start, endDate: now };
  }

  if (range === "30d") {
    const start = new Date();
    start.setDate(now.getDate() - 30);
    return { startDate: start, endDate: now };
  }

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = now;
    return { startDate: start, endDate: end };
  }

  return {};
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range");
    const filters = getDateRange(range);

    const debts = await getDebts(filters);

    const normalized = debts.map((d) => ({
      id: d.id,
      customerName: d.customerName,
      totalDebt: Number(d.totalDebt),
      createdAt: d.createdAt,
      transactions: d.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        note: t.note,
        createdAt: t.createdAt,
      })),
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch debts" },
      { status: 500 },
    );
  }
}
