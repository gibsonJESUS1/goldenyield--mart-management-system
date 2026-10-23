-- Add configured variable-piece price/cost bands.
CREATE TABLE "ProductPiecePriceOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPiecePriceOption_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SaleItem"
ADD COLUMN "piecePriceLabel" TEXT;

CREATE UNIQUE INDEX "ProductPiecePriceOption_productId_label_key"
ON "ProductPiecePriceOption"("productId", "label");

CREATE INDEX "ProductPiecePriceOption_productId_idx"
ON "ProductPiecePriceOption"("productId");

CREATE INDEX "ProductPiecePriceOption_active_idx"
ON "ProductPiecePriceOption"("active");

ALTER TABLE "ProductPiecePriceOption"
ADD CONSTRAINT "ProductPiecePriceOption_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
