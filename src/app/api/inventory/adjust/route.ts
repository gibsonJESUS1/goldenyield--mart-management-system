import { NextResponse } from "next/server";
import { adjustInventory } from "@/lib/db/inventory";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId =
      typeof body.productId === "string" ? body.productId.trim() : "";
    const quantity = Number(body.quantity);
    const note = typeof body.note === "string" ? body.note.trim() : undefined;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(quantity) || quantity === 0) {
      return NextResponse.json(
        { error: "Quantity cannot be zero" },
        { status: 400 },
      );
    }

    const product = await adjustInventory({
      productId,
      quantity,
      note,
    });

    return NextResponse.json(
      {
        message: "Inventory adjusted successfully",
        product,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/inventory/adjust error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to adjust inventory",
      },
      { status: 500 },
    );
  }
}
