-- Add batch/container selling for produce that cannot be counted or reliably weighed.
ALTER TYPE "SaleEntryMode" ADD VALUE 'BATCH_AMOUNT';

CREATE TYPE "BatchInventoryStatus" AS ENUM ('ACTIVE', 'LOW', 'FINISHED');

CREATE TABLE "ProductBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "containerType" TEXT NOT NULL,
    "reference" TEXT,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "status" "BatchInventoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "closedRevenue" DECIMAL(12,2),
    "closedProfit" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SaleItem" ADD COLUMN "productBatchId" TEXT;

CREATE INDEX "ProductBatch_productId_idx" ON "ProductBatch"("productId");
CREATE INDEX "ProductBatch_status_idx" ON "ProductBatch"("status");
CREATE INDEX "ProductBatch_startedAt_idx" ON "ProductBatch"("startedAt");
CREATE INDEX "SaleItem_productBatchId_idx" ON "SaleItem"("productBatchId");

ALTER TABLE "ProductBatch"
ADD CONSTRAINT "ProductBatch_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleItem"
ADD CONSTRAINT "SaleItem_productBatchId_fkey"
FOREIGN KEY ("productBatchId") REFERENCES "ProductBatch"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
