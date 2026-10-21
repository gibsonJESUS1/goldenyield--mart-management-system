import { NextResponse } from "next/server";

import {
  createSaleWithInventory,
  getSales,
  SaleProtectionError,
  type SaleInputMode,
} from "@/lib/db/sale";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

function getRollingRange(days: number) {
  const now = new Date();

  const start = new Date();
  start.setDate(now.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

function getMonthRange() {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

function resolveRange(searchParams: URLSearchParams) {
  const range = searchParams.get("range");

  if (range === "today") return getTodayRange();
  if (range === "7d") return getRollingRange(7);
  if (range === "30d") return getRollingRange(30);
  if (range === "month") return getMonthRange();

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  return {
    start: startDate ? new Date(startDate) : undefined,
    end: endDate ? new Date(endDate) : undefined,
  };
}

type SalesRequestItem = {
  productId: string;
  mode?: SaleInputMode;
  productSaleUnitId?: string;
  quantity?: number;
  weightGrams?: number;
  manualUnitPrice?: number;

  // Legacy client fields: accepted but never trusted.
  unitPrice?: number;
  total?: number;
  baseUnitsConsumed?: number;
};

type SalesRequestBody = {
  customerName?: string;
  subtotal?: number;
  amountPaid: number;
  balance?: number;
  items: SalesRequestItem[];
};

function isValidMode(value: unknown): value is SaleInputMode {
  return (
    value === "STANDARD" ||
    value === "WEIGHT_KG" ||
    value === "VARIABLE_PIECE"
  );
}

function isValidSalesRequestItem(
  item: unknown,
): item is SalesRequestItem {
  if (!item || typeof item !== "object") {
    return false;
  }

  const candidate =
    item as Partial<SalesRequestItem>;

  if (
    typeof candidate.productId !== "string" ||
    candidate.productId.trim().length === 0
  ) {
    return false;
  }

  const mode: SaleInputMode =
    isValidMode(candidate.mode)
      ? candidate.mode
      : "STANDARD";

  if (mode === "WEIGHT_KG") {
    return (
      Number.isInteger(Number(candidate.weightGrams)) &&
      Number(candidate.weightGrams) > 0
    );
  }

  if (mode === "VARIABLE_PIECE") {
    return (
      Number.isInteger(Number(candidate.quantity)) &&
      Number(candidate.quantity) > 0 &&
      Number.isFinite(Number(candidate.manualUnitPrice)) &&
      Number(candidate.manualUnitPrice) > 0
    );
  }

  return (
    typeof candidate.productSaleUnitId === "string" &&
    candidate.productSaleUnitId.trim().length > 0 &&
    Number.isInteger(Number(candidate.quantity)) &&
    Number(candidate.quantity) > 0
  );
}

function paymentStatus(
  amountPaid: number,
  balance: number,
) {
  if (balance <= 0) return "paid";
  if (amountPaid > 0) return "partial";
  return "owed";
}

type SaleWithDetails =
  Awaited<ReturnType<typeof getSales>>[number];

function normalizeSale(sale: SaleWithDetails) {
  const balance = Number(sale.balance);
  const amountPaid = Number(sale.amountPaid);

  return {
    id: sale.id,
    customerName: sale.customerName,
    subtotal: Number(sale.subtotal),
    amountPaid,
    balance,
    paymentStatus: paymentStatus(amountPaid, balance),
    note: sale.note,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,

    items: sale.items.map((item) => {
      const saleUnitName =
        item.saleMode === "WEIGHT_KG"
          ? "Kg"
          : item.saleMode === "VARIABLE_PIECE"
            ? "Piece"
            : item.saleUnit?.unit?.name ?? "Base unit";

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,

        saleMode: item.saleMode,

        saleUnitId: item.saleUnitId,
        productSaleUnitId: item.saleUnitId ?? "",
        saleUnitName,

        quantity: item.quantity,

        quantityInBaseUnit:
          item.quantityInBaseUnit,

        baseUnitsConsumed:
          item.quantityInBaseUnit,

        weightGrams:
          item.weightGrams,

        manualUnitPrice:
          item.manualUnitPrice != null
            ? Number(item.manualUnitPrice)
            : null,

        unitPrice:
          Number(item.unitPrice),

        lineTotal:
          Number(item.lineTotal),

        total:
          Number(item.lineTotal),

        createdAt:
          item.createdAt,

        ownerName:
          item.product.owner?.name ??
          null,
      };
    }),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const { start, end } =
      resolveRange(searchParams);

    const sales = await getSales({
      startDate: start,
      endDate: end,
    });

    return NextResponse.json(
      sales.map(normalizeSale),
    );
  } catch (error) {
    console.error(
      "GET /api/sales error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch sales",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as Partial<SalesRequestBody>;

    if (
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one sale item is required",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(Number(body.amountPaid)) ||
      Number(body.amountPaid) < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid amount paid",
        },
        {
          status: 400,
        },
      );
    }

    const invalidItem =
      body.items.find(
        (item) =>
          !isValidSalesRequestItem(item),
      );

    if (invalidItem) {
      return NextResponse.json(
        {
          error:
            "One or more sale items are invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const sale =
      await createSaleWithInventory({
        customerName:
          body.customerName?.trim() ||
          "Walk-in Customer",

        clientSubtotal:
          body.subtotal != null &&
          Number.isFinite(Number(body.subtotal))
            ? Number(body.subtotal)
            : undefined,

        amountPaid:
          Number(body.amountPaid),

        items:
          body.items.map((item) => ({
            productId:
              item.productId,

            mode:
              isValidMode(item.mode)
                ? item.mode
                : "STANDARD",

            productSaleUnitId:
              item.productSaleUnitId,

            quantity:
              item.quantity != null
                ? Number(item.quantity)
                : undefined,

            weightGrams:
              item.weightGrams != null
                ? Number(item.weightGrams)
                : undefined,

            manualUnitPrice:
              item.manualUnitPrice != null
                ? Number(item.manualUnitPrice)
                : undefined,
          })),
      });

    return NextResponse.json(
      normalizeSale(
        sale as SaleWithDetails,
      ),
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/sales error:",
      error,
    );

    if (
      error instanceof SaleProtectionError
    ) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create sale",
      },
      {
        status: 500,
      },
    );
  }
}
