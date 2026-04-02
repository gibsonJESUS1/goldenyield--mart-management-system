import { NextResponse } from "next/server";
import { restockProduct } from "@/lib/db/product";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      quantityToAdd: number;
      note?: string;
    };

    if (typeof body.quantityToAdd !== "number" || body.quantityToAdd <= 0) {
      return NextResponse.json(
        { error: "Invalid quantityToAdd" },
        { status: 400 },
      );
    }

    const updatedProduct = await restockProduct(
      id,
      body.quantityToAdd,
      body.note,
    );

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("PATCH /api/products/[id]/restock error:", error);
    return NextResponse.json(
      { error: "Failed to restock product" },
      { status: 500 },
    );
  }
}
