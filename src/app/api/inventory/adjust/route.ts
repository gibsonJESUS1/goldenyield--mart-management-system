import { NextResponse } from "next/server";
import { adjustProductStock } from "@/lib/db/inventory";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      productId?: string;
      quantity?: number;
      note?: string;
    };

    if (!body.productId || typeof body.quantity !== "number") {
      return NextResponse.json(
        { error: "Product and quantity are required" },
        { status: 400 },
      );
    }

    const result = await adjustProductStock({
      productId: body.productId,
      quantity: body.quantity,
      note: body.note,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("POST /api/inventory/adjust error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to adjust stock";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
