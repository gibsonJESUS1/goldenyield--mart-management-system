import { NextResponse } from "next/server";
import { createSale, getSales } from "@/lib/db/sale";
import { addDebtFromSale } from "@/lib/db/debt";

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

    const sales = await getSales(filters);

    const normalized = sales.map((sale) => ({
      id: sale.id,
      customerName: sale.customerName,
      subtotal: Number(sale.subtotal),
      amountPaid: Number(sale.amountPaid),
      balance: Number(sale.balance),
      paymentStatus: sale.paymentStatus,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSaleUnitId: item.productSaleUnitId,
        saleUnitName: item.productSaleUnit.unit.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        baseUnitsConsumed: item.baseUnitsConsumed,
      })),
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("GET /api/sales error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customerName?: string;
      subtotal: number;
      amountPaid: number;
      balance: number;
      paymentStatus: "paid" | "partial" | "owed";
      items: Array<{
        productId: string;
        productSaleUnitId: string;
        quantity: number;
        unitPrice: number;
        total: number;
        baseUnitsConsumed: number;
      }>;
    };

    if (
      typeof body.subtotal !== "number" ||
      typeof body.amountPaid !== "number" ||
      typeof body.balance !== "number" ||
      !body.paymentStatus ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid sale payload" },
        { status: 400 },
      );
    }

    const sale = await createSale(body);

    if (body.paymentStatus === "partial" || body.paymentStatus === "owed") {
      const customerName = body.customerName || "Walk-in Customer";

      if (body.balance > 0) {
        await addDebtFromSale(customerName, body.balance);
      }
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales error:", error);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 },
    );
  }
}
