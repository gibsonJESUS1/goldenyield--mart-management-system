import { NextResponse } from "next/server";
import { createSaleWithInventory, getSales } from "@/lib/db/sale";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function resolveRange(searchParams: URLSearchParams) {
  const range = searchParams.get("range");

  if (range === "today") {
    return getTodayRange();
  }

  if (range === "week") {
    return getWeekRange();
  }

  if (range === "month") {
    return getMonthRange();
  }

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  return {
    start: startDate ? new Date(startDate) : undefined,
    end: endDate ? new Date(endDate) : undefined,
  };
}

type SalesRequestItem = {
  productId: string;
  productSaleUnitId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  baseUnitsConsumed: number;
};

type SalesRequestBody = {
  customerName?: string;
  subtotal: number;
  amountPaid: number;
  balance: number;
  items: SalesRequestItem[];
};

function isValidSalesRequestItem(item: unknown): item is SalesRequestItem {
  if (!item || typeof item !== "object") {
    return false;
  }

  const candidate = item as Partial<SalesRequestItem>;

  return (
    typeof candidate.productId === "string" &&
    candidate.productId.trim().length > 0 &&
    typeof candidate.productSaleUnitId === "string" &&
    candidate.productSaleUnitId.trim().length > 0 &&
    Number.isFinite(Number(candidate.quantity)) &&
    Number(candidate.quantity) > 0 &&
    Number.isFinite(Number(candidate.unitPrice)) &&
    Number(candidate.unitPrice) >= 0 &&
    Number.isFinite(Number(candidate.total)) &&
    Number(candidate.total) >= 0 &&
    Number.isFinite(Number(candidate.baseUnitsConsumed)) &&
    Number(candidate.baseUnitsConsumed) > 0
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { start, end } = resolveRange(searchParams);

    const sales = await getSales({
      startDate: start,
      endDate: end,
    });

    const normalized = sales.map((sale) => ({
      id: sale.id,
      customerName: sale.customerName,
      subtotal: Number(sale.subtotal),
      amountPaid: Number(sale.amountPaid),
      balance: Number(sale.balance),
      note: sale.note,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        saleUnitId: item.saleUnitId,
        saleUnitName: item.saleUnit?.unit?.name ?? "Base unit",
        quantity: item.quantity,
        quantityInBaseUnit: item.quantityInBaseUnit,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        unitCostPrice:
          item.unitCostPrice != null ? Number(item.unitCostPrice) : null,
        lineCostTotal:
          item.lineCostTotal != null ? Number(item.lineCostTotal) : null,
        lineProfit: item.lineProfit != null ? Number(item.lineProfit) : null,
        createdAt: item.createdAt,
        ownerName: item.product.owner?.name ?? null,
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
    const body = (await request.json()) as Partial<SalesRequestBody>;

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one sale item is required" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(Number(body.subtotal)) || Number(body.subtotal) < 0) {
      return NextResponse.json({ error: "Invalid subtotal" }, { status: 400 });
    }

    if (
      !Number.isFinite(Number(body.amountPaid)) ||
      Number(body.amountPaid) < 0
    ) {
      return NextResponse.json(
        { error: "Invalid amount paid" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(Number(body.balance)) || Number(body.balance) < 0) {
      return NextResponse.json({ error: "Invalid balance" }, { status: 400 });
    }

    const invalidItem = body.items.find(
      (item) => !isValidSalesRequestItem(item),
    );

    if (invalidItem) {
      return NextResponse.json(
        {
          error:
            "One or more sale items are invalid. Ensure product, unit, quantity, price, total, and base unit conversion are valid.",
        },
        { status: 400 },
      );
    }

    const sale = await createSaleWithInventory({
      customerName: body.customerName?.trim() || "Walk-in Customer",
      subtotal: Number(body.subtotal),
      amountPaid: Number(body.amountPaid),
      balance: Number(body.balance),
      items: body.items.map((item) => ({
        productId: item.productId,
        productSaleUnitId: item.productSaleUnitId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        baseUnitsConsumed: Number(item.baseUnitsConsumed),
      })),
    });

    const normalized = {
      id: sale.id,
      customerName: sale.customerName,
      subtotal: Number(sale.subtotal),
      amountPaid: Number(sale.amountPaid),
      balance: Number(sale.balance),
      note: sale.note,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        saleUnitId: item.saleUnitId,
        saleUnitName: item.saleUnit?.unit?.name ?? "Base unit",
        quantity: item.quantity,
        quantityInBaseUnit: item.quantityInBaseUnit,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        unitCostPrice:
          item.unitCostPrice != null ? Number(item.unitCostPrice) : null,
        lineCostTotal:
          item.lineCostTotal != null ? Number(item.lineCostTotal) : null,
        lineProfit: item.lineProfit != null ? Number(item.lineProfit) : null,
        createdAt: item.createdAt,
        ownerName: item.product.owner?.name ?? null,
      })),
    };

    return NextResponse.json(normalized, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create sale",
      },
      { status: 500 },
    );
  }
}
