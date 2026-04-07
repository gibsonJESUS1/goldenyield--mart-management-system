import { NextResponse } from "next/server";
import { getTodaySaleItems, getTodaySalesSummary } from "@/lib/db/sale";

export async function GET() {
  try {
    const [items, summary] = await Promise.all([
      getTodaySaleItems(),
      getTodaySalesSummary(),
    ]);

    const normalizedItems = items.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      productName: item.product.name,
      quantity: item.quantity,
      quantityInBaseUnit: item.quantityInBaseUnit,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      lineProfit: Number(item.lineProfit ?? 0),
      saleUnitName: item.saleUnit?.unit?.name ?? null,
      saleId: item.sale.id,
      customerName: item.sale.customerName,
      amountPaid: Number(item.sale.amountPaid),
      balance: Number(item.sale.balance),
      saleCreatedAt: item.sale.createdAt,
    }));

    return NextResponse.json({
      summary,
      items: normalizedItems,
    });
  } catch (error) {
    console.error("GET /api/sales/today error:", error);
    return NextResponse.json(
      { message: "Failed to load today sales" },
      { status: 500 },
    );
  }
}
