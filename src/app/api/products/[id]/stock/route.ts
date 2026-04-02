import { NextResponse } from "next/server";
import { reduceProductStock } from "@/lib/db/product";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = (await request.json()) as {
      quantityToReduce: number;
    };

    const { id } = await params;

    if (
      typeof body.quantityToReduce !== "number" ||
      body.quantityToReduce <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid quantityToReduce" },
        { status: 400 },
      );
    }

    const updatedProduct = await reduceProductStock(id, body.quantityToReduce);

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("PATCH /api/products/[id]/stock error:", error);
    return NextResponse.json(
      { error: "Failed to reduce stock" },
      { status: 500 },
    );
  }
}
