import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(roundMoney(value).toFixed(2));
}

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ")
    : "";
}

async function getBatchPayload(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      stock: true,
      weightStockGrams: true,
      batches: {
        orderBy: { startedAt: "desc" },
        take: 10,
        include: {
          saleItems: {
            select: {
              id: true,
              lineTotal: true,
              lineProfit: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  const batches = product.batches.map((batch) => {
    const revenue = roundMoney(
      batch.saleItems.reduce(
        (sum, item) => sum + Number(item.lineTotal),
        0,
      ),
    );

    return {
      id: batch.id,
      containerType: batch.containerType,
      reference: batch.reference,
      totalCost: Number(batch.totalCost),
      status: batch.status,
      note: batch.note,
      startedAt: batch.startedAt,
      finishedAt: batch.finishedAt,
      closedRevenue:
        batch.closedRevenue != null
          ? Number(batch.closedRevenue)
          : null,
      closedProfit:
        batch.closedProfit != null
          ? Number(batch.closedProfit)
          : null,
      salesCount: batch.saleItems.length,
      revenue,
    };
  });

  return {
    product: {
      id: product.id,
      name: product.name,
      countStock: product.stock,
      weightStockGrams: product.weightStockGrams,
    },
    activeBatch:
      batches.find(
        (batch) =>
          batch.status === "ACTIVE" || batch.status === "LOW",
      ) ?? null,
    recentBatches: batches,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await getBatchPayload(id);

    if (!payload) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/products/[id]/batch-config error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load batch setup.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      containerType?: string;
      reference?: string;
      totalCost?: number;
      note?: string;
    };

    const containerType = normalizeText(body.containerType);
    const reference = normalizeText(body.reference) || null;
    const note = normalizeText(body.note) || null;
    const totalCost = Number(body.totalCost);

    if (!containerType) {
      return NextResponse.json(
        { error: "Enter the container type, for example Basket, Crate or Bag." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      return NextResponse.json(
        { error: "Batch purchase cost must be greater than zero." },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      async (tx) => {
        const product = await tx.product.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            active: true,
            stock: true,
            weightStockGrams: true,
          },
        });

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        if (!product.active) {
          throw new Error("PRODUCT_ARCHIVED");
        }

        if (product.stock > 0 || product.weightStockGrams > 0) {
          throw new Error("OTHER_STOCK_PRESENT");
        }

        const existing = await tx.productBatch.findFirst({
          where: {
            productId: id,
            status: { in: ["ACTIVE", "LOW"] },
          },
        });

        if (existing) {
          throw new Error("ACTIVE_BATCH_EXISTS");
        }

        await tx.productBatch.create({
          data: {
            productId: id,
            containerType,
            reference,
            totalCost: toDecimal(totalCost),
            note,
            status: "ACTIVE",
          },
        });
      },
      { maxWait: 10000, timeout: 30000 },
    );

    return NextResponse.json(await getBatchPayload(id), { status: 201 });
  } catch (error) {
    console.error("POST /api/products/[id]/batch-config error:", error);

    if (error instanceof Error) {
      const messages: Record<string, string> = {
        PRODUCT_NOT_FOUND: "Product not found.",
        PRODUCT_ARCHIVED: "Restore the product before starting a batch.",
        OTHER_STOCK_PRESENT:
          "Set count stock and weight stock to zero before starting batch/container selling. This prevents the same physical stock from being counted twice.",
        ACTIVE_BATCH_EXISTS:
          "This product already has an active batch. Close it before starting another one.",
      };

      if (messages[error.message]) {
        return NextResponse.json(
          { error: messages[error.message] },
          { status: error.message === "PRODUCT_NOT_FOUND" ? 404 : 400 },
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to start batch.",
      },
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
      action?: "MARK_LOW" | "MARK_ACTIVE" | "CLOSE";
      batchId?: string;
    };

    if (!body.batchId || !body.action) {
      return NextResponse.json(
        { error: "Batch action is incomplete." },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      async (tx) => {
        const batch = await tx.productBatch.findFirst({
          where: {
            id: body.batchId,
            productId: id,
          },
          include: {
            saleItems: {
              orderBy: [
                { createdAt: "asc" },
                { id: "asc" },
              ],
            },
          },
        });

        if (!batch) {
          throw new Error("BATCH_NOT_FOUND");
        }

        if (batch.status === "FINISHED") {
          throw new Error("BATCH_ALREADY_FINISHED");
        }

        if (body.action === "MARK_LOW" || body.action === "MARK_ACTIVE") {
          await tx.productBatch.update({
            where: { id: batch.id },
            data: {
              status: body.action === "MARK_LOW" ? "LOW" : "ACTIVE",
            },
          });
          return;
        }

        if (body.action !== "CLOSE") {
          throw new Error("INVALID_ACTION");
        }

        const totalCost = roundMoney(Number(batch.totalCost));
        const totalRevenue = roundMoney(
          batch.saleItems.reduce(
            (sum, item) => sum + Number(item.lineTotal),
            0,
          ),
        );

        let allocatedCost = 0;

        for (let index = 0; index < batch.saleItems.length; index += 1) {
          const item = batch.saleItems[index];
          const lineTotal = roundMoney(Number(item.lineTotal));
          const isLast = index === batch.saleItems.length - 1;

          const costShare = Math.max(
            totalRevenue <= 0
              ? 0
              : isLast
                ? roundMoney(totalCost - allocatedCost)
                : roundMoney(totalCost * (lineTotal / totalRevenue)),
            0,
          );

          allocatedCost = roundMoney(allocatedCost + costShare);

          await tx.saleItem.update({
            where: { id: item.id },
            data: {
              unitCostPrice: toDecimal(Math.max(costShare, 0)),
              lineCostTotal: toDecimal(Math.max(costShare, 0)),
              lineProfit: toDecimal(roundMoney(lineTotal - costShare)),
            },
          });
        }

        await tx.productBatch.update({
          where: { id: batch.id },
          data: {
            status: "FINISHED",
            finishedAt: new Date(),
            closedRevenue: toDecimal(totalRevenue),
            closedProfit: toDecimal(roundMoney(totalRevenue - totalCost)),
          },
        });
      },
      { maxWait: 10000, timeout: 30000 },
    );

    return NextResponse.json(await getBatchPayload(id));
  } catch (error) {
    console.error("PATCH /api/products/[id]/batch-config error:", error);

    if (error instanceof Error) {
      const messages: Record<string, string> = {
        BATCH_NOT_FOUND: "Batch not found.",
        BATCH_ALREADY_FINISHED: "This batch is already finished.",
        INVALID_ACTION: "Unknown batch action.",
      };

      if (messages[error.message]) {
        return NextResponse.json(
          { error: messages[error.message] },
          { status: error.message === "BATCH_NOT_FOUND" ? 404 : 400 },
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update batch.",
      },
      { status: 500 },
    );
  }
}
