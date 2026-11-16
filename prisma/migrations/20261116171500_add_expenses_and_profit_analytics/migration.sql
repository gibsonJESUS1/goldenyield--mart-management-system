-- Add operating/business expenses.
-- Expenses are intentionally separate from product cost of goods.
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Expense_spentAt_idx" ON "Expense"("spentAt");
CREATE INDEX "Expense_productId_idx" ON "Expense"("productId");
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
