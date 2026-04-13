import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { productId: string } },
) {
  try {
    const { productId } = params;

    const history = await prisma.productCostPriceHistory.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(
      history.map((h) => ({
        id: h.id,
        oldCostPrice: h.oldCostPrice ? Number(h.oldCostPrice) : null,
        newCostPrice: Number(h.newCostPrice),
        changeType: h.changeType,
        note: h.note,
        reference: h.reference,
        createdAt: h.createdAt,
      })),
    );
  } catch (error) {
    console.error("Cost history error:", error);

    return NextResponse.json(
      { message: "Failed to load cost history" },
      { status: 500 },
    );
  }
}
