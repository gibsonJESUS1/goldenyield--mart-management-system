import { NextResponse } from "next/server";
import { getStockMovements } from "@/lib/db/product";

export async function GET() {
  try {
    const movements = await getStockMovements();

    return NextResponse.json(
      movements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        note: movement.note,
        createdAt: movement.createdAt,
        product: {
          id: movement.product.id,
          name: movement.product.name,
          ownerName: movement.product.owner.name,
          category: movement.product.category.name,
          unit: movement.product.unit.name,
        },
      })),
    );
  } catch (error) {
    console.error("GET /api/stock-movements error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 },
    );
  }
}
