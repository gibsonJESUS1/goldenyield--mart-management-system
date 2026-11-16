GOLDEN YIELD MART — EXPENSES + PROFIT ANALYTICS
================================================

WHAT THIS UPDATE ADDS
---------------------
1. Daily business expense recording.
2. Optional product-linked expenses.
3. Profit Analytics page with:
   - Today
   - This week
   - This month
   - Last 3 months
   - Last 6 months
   - This year
   - Custom date range
4. Product selector for product-level profitability.
5. Sales Revenue, Cost of Goods, Gross Profit, Expenses and Net Profit.
6. Day/week/month timeline breakdown depending on selected period.
7. Product profitability table.
8. Expense-category breakdown.
9. Zero-sale finished Batch/Container losses are included in Cost of Goods.
10. Open Batch/Container sales with pending cost allocation are clearly flagged.

ACCOUNTING LOGIC
----------------
Gross Profit = Sales Revenue - Cost of Goods
Net Profit   = Gross Profit - Operating Expenses

When ALL PRODUCTS / WHOLE BUSINESS is selected:
- Every recorded expense in the period is deducted.

When ONE PRODUCT is selected:
- Only expenses explicitly linked to that product are deducted.
- General business expenses are NOT forced onto that product.

This prevents generator fuel, rent, etc. from being arbitrarily charged to one product.

EXPENSE EXAMPLES
----------------
General Business:
- Generator fuel
- Electricity
- Staff wages
- Rent
- General transport

Product-linked:
- Transport specifically for a goat purchase
- Special packaging used only for frozen chicken
- Spoilage/loss specifically belonging to tomatoes

FILES ADDED
-----------
prisma/migrations/20261116171500_add_expenses_and_profit_analytics/migration.sql
src/lib/report-period.ts
src/lib/db/expenses.ts
src/lib/db/business-analytics.ts
src/app/api/expenses/route.ts
src/app/api/expenses/[id]/route.ts
src/app/(dashboard)/expenses/page.tsx
src/app/(dashboard)/analytics/page.tsx
src/features/expenses/components/expenses-manager.tsx
src/features/reports/components/business-analytics-filter.tsx

FILES REPLACED
--------------
prisma/schema.prisma
src/components/layout/app-sidebar.tsx

SAFE TEST INSTALLATION
----------------------
1. Extract this ZIP into the project root so src/ and prisma/ merge.
2. Confirm BOTH local database URLs point to TEST / late-leaf.
3. Run:

   npx prisma migrate status
   npx prisma migrate deploy
   npx prisma generate
   rm -rf .next
   npm run build

4. If the build passes:

   npm run dev

5. Test:
   - Expenses -> add a generator fuel expense.
   - Expenses -> add a product-linked expense.
   - Profit Analytics -> Today.
   - Profit Analytics -> This week.
   - Profit Analytics -> This month.
   - Profit Analytics -> This year.
   - Select one product and verify its sales/cost/profit.

DO NOT RUN prisma migrate dev AGAINST LIVE.
Do not push until TEST migration, build and functional testing pass.

LIVE DEPLOYMENT LATER
---------------------
Use the same safe process already used for Golden Yield:
- DATABASE_URL stays TEST locally.
- Temporarily set DIRECT_URL to LIVE only for `npx prisma migrate deploy`.
- Confirm the LIVE migration succeeds.
- Return DIRECT_URL to TEST.
- Then push main so Vercel deploys code after LIVE schema is ready.

MIGRATION
---------
20261116171500_add_expenses_and_profit_analytics

It only ADDS the Expense table and indexes/relationship. It does not delete sales,
products, batches, purchases, debts, stock movements, or historical profit snapshots.
