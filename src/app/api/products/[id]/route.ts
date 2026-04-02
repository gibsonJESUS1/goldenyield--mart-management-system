import { NextResponse } from "next/server";
import { deleteProduct, getProductById, updateProduct } from "@/lib/db/product";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,
      ownerId: product.ownerId,
      ownerName: product.owner.name,
      categoryId: product.categoryId,
      category: product.category.name,
      unitId: product.unitId,
      unit: product.unit.name,
      stock: product.stock,
      lowStock: product.lowStock,
      active: product.active,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      saleUnits: product.saleUnits.map((saleUnit) => ({
        id: saleUnit.id,
        unitId: saleUnit.unitId,
        unitName: saleUnit.unit.name,
        quantityInBaseUnit: saleUnit.quantityInBaseUnit,
        sellingPrice: Number(saleUnit.sellingPrice),
        isDefault: saleUnit.isDefault,
        active: saleUnit.active,
        priceRules: saleUnit.priceRules.map((rule) => ({
          id: rule.id,
          quantity: rule.quantity,
          price: Number(rule.price),
          active: rule.active,
        })),
      })),
    });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name: string;
      ownerId: string;
      categoryId: string;
      unitId: string;
      stock: number;
      lowStock: number;
      active?: boolean;
      saleUnits: Array<{
        id?: string;
        unitId: string;
        quantityInBaseUnit: number;
        sellingPrice: number;
        isDefault?: boolean;
        active?: boolean;
        priceRules?: Array<{
          quantity: number;
          price: number;
          active?: boolean;
        }>;
      }>;
    };

    if (
      !body.name ||
      !body.ownerId ||
      !body.categoryId ||
      !body.unitId ||
      typeof body.stock !== "number" ||
      typeof body.lowStock !== "number" ||
      !Array.isArray(body.saleUnits) ||
      body.saleUnits.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid product payload" },
        { status: 400 },
      );
    }

    const product = await updateProduct(id, body);

    return NextResponse.json({
      id: product.id,
      name: product.name,
      ownerId: product.ownerId,
      ownerName: product.owner.name,
      categoryId: product.categoryId,
      category: product.category.name,
      unitId: product.unitId,
      unit: product.unit.name,
      stock: product.stock,
      lowStock: product.lowStock,
      active: product.active,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      saleUnits: product.saleUnits.map((saleUnit) => ({
        id: saleUnit.id,
        unitId: saleUnit.unitId,
        unitName: saleUnit.unit.name,
        quantityInBaseUnit: saleUnit.quantityInBaseUnit,
        sellingPrice: Number(saleUnit.sellingPrice),
        isDefault: saleUnit.isDefault,
        active: saleUnit.active,
        priceRules: saleUnit.priceRules.map((rule) => ({
          id: rule.id,
          quantity: rule.quantity,
          price: Number(rule.price),
          active: rule.active,
        })),
      })),
    });
  } catch (error) {
    console.error("PATCH /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await deleteProduct(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
