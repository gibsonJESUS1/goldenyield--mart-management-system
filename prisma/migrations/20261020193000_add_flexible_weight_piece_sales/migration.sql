-- Flexible fish/meat sales.
CREATE TYPE "SaleEntryMode" AS ENUM ('STANDARD', 'WEIGHT_KG', 'VARIABLE_PIECE');
CREATE TYPE "InventoryBucket" AS ENUM ('COUNT', 'WEIGHT_GRAMS');

ALTER TABLE "Product"
ADD COLUMN "weightTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "weightStockGrams" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lowWeightStockGrams" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "costPerKg" DECIMAL(12,2),
ADD COLUMN "pricePerKg" DECIMAL(12,2),
ADD COLUMN "allowVariablePiecePrice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "minPiecePrice" DECIMAL(12,2),
ADD COLUMN "maxPiecePrice" DECIMAL(12,2);

ALTER TABLE "SaleItem"
ADD COLUMN "saleMode" "SaleEntryMode" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "weightGrams" INTEGER,
ADD COLUMN "manualUnitPrice" DECIMAL(12,2);

ALTER TABLE "StockMovement"
ADD COLUMN "bucket" "InventoryBucket" NOT NULL DEFAULT 'COUNT';

CREATE INDEX "SaleItem_saleMode_idx" ON "SaleItem"("saleMode");
CREATE INDEX "StockMovement_bucket_idx" ON "StockMovement"("bucket");
