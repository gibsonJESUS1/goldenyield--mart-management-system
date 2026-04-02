import { NextResponse } from "next/server";
import { createProduct, getProducts } from "@/lib/db/product";

export async function GET() {
  try {
    const products = await getProducts();

    const normalized = products.map((product) => ({
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
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name: string;
      ownerId: string;
      categoryId: string;
      unitId: string;
      stock: number;
      lowStock: number;
      active?: boolean;
      saleUnits: Array<{
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

    const product = await createProduct(body);

    return NextResponse.json(
      {
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
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
