/*
  Warnings:

  - You are about to drop the column `category` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `ownerName` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Product` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'partial', 'owed');

-- CreateEnum
CREATE TYPE "DebtTransactionType" AS ENUM ('SALE_DEBT', 'MANUAL_DEBT', 'PAYMENT', 'ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "category",
DROP COLUMN "ownerName",
DROP COLUMN "price",
DROP COLUMN "unit",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "currentCostPrice" DECIMAL(12,2),
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "unitId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ProductSaleUnitPriceRule" (
    "id" TEXT NOT NULL,
    "productSaleUnitId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSaleUnitPriceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSaleUnit" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantityInBaseUnit" INTEGER NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSaleUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "customerName" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "saleUnitId" TEXT,
    "quantity" INTEGER NOT NULL,
    "quantityInBaseUnit" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "unitCostPrice" DECIMAL(12,2),
    "lineCostTotal" DECIMAL(12,2),
    "lineProfit" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDebt" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT,
    "balance" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerDebt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtTransaction" (
    "id" TEXT NOT NULL,
    "customerDebtId" TEXT NOT NULL,
    "saleId" TEXT,
    "type" "DebtTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "reference" TEXT,
    "supplierName" TEXT,
    "note" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityInBaseUnit" INTEGER NOT NULL,
    "unitCostPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSaleUnitPriceRule_productSaleUnitId_idx" ON "ProductSaleUnitPriceRule"("productSaleUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSaleUnitPriceRule_productSaleUnitId_quantity_key" ON "ProductSaleUnitPriceRule"("productSaleUnitId", "quantity");

-- CreateIndex
CREATE INDEX "ProductSaleUnit_productId_idx" ON "ProductSaleUnit"("productId");

-- CreateIndex
CREATE INDEX "ProductSaleUnit_unitId_idx" ON "ProductSaleUnit"("unitId");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");

-- CreateIndex
CREATE INDEX "DebtTransaction_customerDebtId_idx" ON "DebtTransaction"("customerDebtId");

-- CreateIndex
CREATE INDEX "DebtTransaction_saleId_idx" ON "DebtTransaction"("saleId");

-- CreateIndex
CREATE INDEX "DebtTransaction_createdAt_idx" ON "DebtTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProductUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSaleUnitPriceRule" ADD CONSTRAINT "ProductSaleUnitPriceRule_productSaleUnitId_fkey" FOREIGN KEY ("productSaleUnitId") REFERENCES "ProductSaleUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSaleUnit" ADD CONSTRAINT "ProductSaleUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSaleUnit" ADD CONSTRAINT "ProductSaleUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProductUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleUnitId_fkey" FOREIGN KEY ("saleUnitId") REFERENCES "ProductSaleUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtTransaction" ADD CONSTRAINT "DebtTransaction_customerDebtId_fkey" FOREIGN KEY ("customerDebtId") REFERENCES "CustomerDebt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtTransaction" ADD CONSTRAINT "DebtTransaction_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
