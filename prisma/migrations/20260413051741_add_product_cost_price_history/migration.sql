-- CreateEnum
CREATE TYPE "CostPriceChangeType" AS ENUM ('PURCHASE', 'MANUAL_UPDATE');

-- CreateTable
CREATE TABLE "ProductCostPriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldCostPrice" DECIMAL(12,2),
    "newCostPrice" DECIMAL(12,2) NOT NULL,
    "changeType" "CostPriceChangeType" NOT NULL,
    "note" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCostPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCostPriceHistory_productId_idx" ON "ProductCostPriceHistory"("productId");

-- CreateIndex
CREATE INDEX "ProductCostPriceHistory_changeType_idx" ON "ProductCostPriceHistory"("changeType");

-- CreateIndex
CREATE INDEX "ProductCostPriceHistory_createdAt_idx" ON "ProductCostPriceHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductCostPriceHistory" ADD CONSTRAINT "ProductCostPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
