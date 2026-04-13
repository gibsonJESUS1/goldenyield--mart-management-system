import { NextResponse } from "next/server";
import { createPurchase, getPurchases } from "@/lib/db/purchase";
import { createPurchaseSchema } from "@/lib/validations/purchase";

export async function GET() {
  try {
    const purchases = await getPurchases();

    const normalized = purchases.map((purchase) => ({
      id: purchase.id,
      reference: purchase.reference,
      supplierName: purchase.supplierName,
      note: purchase.note,
      totalAmount: Number(purchase.totalAmount),
      purchasedAt: purchase.purchasedAt,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
      items: purchase.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        ownerName: item.product.owner.name,
        categoryName: item.product.category.name,
        unitName: item.product.unit.name,
        quantityInBaseUnit: item.quantityInBaseUnit,
        unitCostPrice: Number(item.unitCostPrice),
        lineTotal: Number(item.lineTotal),
        createdAt: item.createdAt,
      })),
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("GET /api/purchases error:", error);

    return NextResponse.json(
      { message: "Failed to load purchases" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createPurchaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid purchase payload",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const purchase = await createPurchase(parsed.data);

    return NextResponse.json(
      {
        message: "Purchase created successfully",
        purchase: purchase
          ? {
              id: purchase.id,
              reference: purchase.reference,
              supplierName: purchase.supplierName,
              note: purchase.note,
              totalAmount: Number(purchase.totalAmount),
              purchasedAt: purchase.purchasedAt,
              items: purchase.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                productName: item.product.name,
                quantityInBaseUnit: item.quantityInBaseUnit,
                unitCostPrice: Number(item.unitCostPrice),
                lineTotal: Number(item.lineTotal),
              })),
            }
          : null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/purchases error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to create purchase",
      },
      { status: 500 },
    );
  }
}
