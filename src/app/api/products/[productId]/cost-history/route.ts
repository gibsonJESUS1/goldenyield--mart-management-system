import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { productId } = await context.params;

    const history = await prisma.productCostPriceHistory.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(
      history.map((item) => ({
        id: item.id,
        oldCostPrice:
          item.oldCostPrice != null ? Number(item.oldCostPrice) : null,
        newCostPrice: Number(item.newCostPrice),
        changeType: item.changeType,
        note: item.note,
        reference: item.reference,
        createdAt: item.createdAt,
      })),
    );
  } catch (error) {
    console.error("GET /api/products/[productId]/cost-history error:", error);

    return NextResponse.json(
      { message: "Failed to load cost history" },
      { status: 500 },
    );
  }
}
