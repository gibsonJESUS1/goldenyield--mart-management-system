FLEXIBLE FISH / MEAT SALES
===========================

This update supports Golden Yield's real selling workflow without breaking the
existing standard Piece / Pack / Roll / Carton style sales.

WHAT IT SUPPORTS
----------------

Sawa Fresh:
- Sell by weight, e.g. ₦3,500/kg.
- OR sell 1 whole fish without weighing it.
- For a whole fish, the cashier enters the actual price based on size,
  e.g. ₦1,000, ₦1,200 or ₦1,500.

Panla Fresh:
- Sell by weight, e.g. ₦3,000/kg.
- Can also enable whole-piece size pricing if needed.

Smoked / Fried Fish:
- Can use variable piece pricing only, e.g. ₦500–₦700 by size.

Goat Meat:
- Can use weight selling only.

Chicken / Turkey:
- Can use weight selling.
- A separate product such as Chicken Lap or Turkey Lap can also enable
  size-priced piece selling when needed.

Titus can later use the same setup as the other fish.


IMPORTANT STOCK RULE
--------------------

The update keeps TWO independent operational balances when both methods are
enabled:

1. COUNT STOCK
   Example: 12 whole Sawa fish.

2. WEIGHT STOCK
   Example: 9.6kg available for kilogram sales.

If a customer buys one whole fish without weighing:
- count stock decreases by 1;
- weight stock does NOT change.

If a customer buys 0.65kg:
- weight stock decreases by 650g;
- count stock does NOT change.

This matches the requested cashier workflow. Because the two balances are
independent, periodically use stock take/recount to reconcile them with the
physical fish in the freezer/display.


HOW TO CONFIGURE SAWA FRESH
---------------------------

First create/restore the product normally.

Recommended normal product setup:
- Product name: Sawa Fresh
- Base stock unit: Pieces
- Opening count stock: number of whole fish you want to track
- Current cost price: average acquisition cost per whole fish/piece
- Normal base selling row: keep a valid price so the existing product
  validation remains intact. Once variable piece selling is enabled, that
  ordinary one-piece selling row is hidden from the cashier.

Then in Product Centre:
1. Click "Fish / Meat Selling".
2. Enable "Sell this product by weight (Kg)".
3. Enter:
   - Current weight stock, e.g. 9.6
   - Cost per Kg, using your real acquisition cost
   - Selling price per Kg = 3500
   - Low-weight alert if wanted
4. Enable "Sell individual pieces at a price based on size".
5. Enter normal piece-price guide:
   - Minimum = 1000
   - Maximum = 1500
6. Save.

At Sales:
- customer asks for 0.65kg -> use "Sell by Weight"
- customer asks for 1 whole fish -> use "Sell Whole Piece by Size"
  and enter the price; NO WEIGHT is required.


PRICE SAFETY
------------

Weight sale:
- backend gets the official product price/kg and cost/kg;
- cashier cannot override those hidden cost values;
- sale below cost is blocked.

Variable piece sale:
- cashier enters the actual piece price;
- the normal min/max is a guide, not a hard limit;
- price outside the range triggers a confirmation in the cashier UI;
- backend still blocks a piece sale below the product's current cost per piece.

NOTE:
For size-priced whole fish, profit is based on the configured average cost per
piece because the fish is deliberately not weighed at sale time.


DATABASE / MIGRATION SAFETY
---------------------------

This feature requires a database migration.

DO NOT run:
    npx prisma migrate dev

while DATABASE_URL points to your LIVE database.

The package already includes the migration SQL, so `migrate dev` is not needed
to create the migration.

Safe local/dev test sequence:
1. Make sure `.env` points to your DEV database.
2. Copy the package files into the project using the same relative paths.
3. Run:
       npx prisma generate
       npx prisma migrate deploy
       npm run build
4. Start the app and test Sawa with small test stock.
5. Only after local/dev testing passes, commit/push the code.
6. For the LIVE database, apply the already-created migration with:
       npx prisma migrate deploy

The migration is additive: it adds columns/enums with safe defaults and does not
delete products, sales, debts, purchases, or stock history.


FILES IN THIS UPDATE
--------------------

prisma/schema.prisma
prisma/migrations/20261020193000_add_flexible_weight_piece_sales/migration.sql

src/app/api/products/route.ts
src/app/api/products/[id]/route.ts
src/app/api/products/[id]/flexible-config/route.ts

src/app/api/sales/route.ts
src/lib/db/sale.ts

src/features/products/components/flexible-sale-config-button.tsx

src/app/(dashboard)/products/page.tsx
src/app/(dashboard)/sales/page.tsx


FIRST TEST TO RUN
-----------------

Use a TEST product such as Sawa Fresh.

Example configuration:
- Count stock: 3 Pieces
- Average cost / Piece: e.g. ₦800
- Weight stock: 2kg
- Cost/kg: e.g. ₦2,800
- Selling/kg: ₦3,500
- Piece guide: ₦1,000–₦1,500

Test A — whole fish:
- choose "Sell Whole Piece by Size"
- quantity 1
- price ₦1,200
EXPECTED:
- count stock: 3 -> 2
- weight stock: remains 2kg
- sale revenue: ₦1,200

Test B — weight:
- choose "Sell by Weight"
- enter 0.65kg
EXPECTED:
- amount: ₦2,275
- weight stock: 2kg -> 1.35kg
- count stock: remains 2 Pieces

Do not test first on a real high-value live stock item.
