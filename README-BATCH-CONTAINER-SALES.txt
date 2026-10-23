GOLDEN YIELD MART — BATCH / CONTAINER SELLING
==============================================

This package is CUMULATIVE.
It contains the earlier flexible fish/meat + Fried Panla price-band work and the new batch/container selling mode.

NEW USE CASE
------------
For products such as:
- Fresh pepper
- Tomatoes
- Onions
- Vegetables / okra / garden egg
- Similar produce bought as a Basket / Crate / Bag where exact piece count or kg is not reliable

The app can now:
1. Start a batch with ONE known total purchase cost.
2. Sell from that batch by money amount: quick ₦200 / ₦300 / ₦500 or any custom amount.
3. Mark the physical batch LOW when it is getting low.
4. Close the batch when physically finished.
5. On close, calculate:
      Batch Profit = Total Batch Sales - Total Batch Purchase Cost
6. Allocate that known batch cost proportionally across its sale records so existing product/sales profit reports can use the finalized lineProfit values.

IMPORTANT ACCOUNTING BEHAVIOUR
------------------------------
While a batch is ACTIVE or LOW:
- Revenue is recorded normally.
- lineCostTotal / lineProfit for those batch sale lines are left pending (null).
- Existing summaries that treat null profit as 0 will temporarily understate profit.

When you CLOSE / FINISH the batch:
- The total batch purchase cost is allocated across all that batch's sales in proportion to each sale amount.
- Historical batch sale lineCostTotal and lineProfit are finalized.
- closedRevenue and closedProfit are saved on ProductBatch.

This is more truthful than inventing kilograms or pieces that were never measured.

INVENTORY MODES
---------------
1. COUNT
   Drinks, biscuits, sachet water, etc.

2. WEIGHT
   Chicken, turkey, goat meat, fish etc. where you can actually weigh stock and sales.

3. BATCH / CONTAINER
   Pepper, tomatoes, onions, vegetables etc. where purchase quantity cannot be reliably counted/weighed.

Do not use two inventory modes for the same physical stock at the same time.
The server blocks starting a batch if count stock > 0 or weight stock > 0.

FILES IN THIS UPDATE
--------------------
prisma/schema.prisma
prisma/migrations/20261020193000_add_flexible_weight_piece_sales/migration.sql
prisma/migrations/20261023162000_add_piece_price_bands/migration.sql
prisma/migrations/20261023183000_add_batch_container_sales/migration.sql

src/lib/db/product.ts
src/lib/db/sale.ts
src/app/api/products/route.ts
src/app/api/products/[id]/route.ts
src/app/api/products/[id]/flexible-config/route.ts
src/app/api/products/[id]/batch-config/route.ts
src/app/api/sales/route.ts
src/app/(dashboard)/sales/page.tsx
src/features/products/components/flexible-sale-config-button.tsx

SAFE INSTALL / TEST ORDER
-------------------------
1. Confirm LOCAL .env is TEST / late-leaf for BOTH:
   DATABASE_URL
   DIRECT_URL

2. Copy these files into the project, preserving their paths.

3. DO NOT use prisma migrate dev against live.

4. On TEST only run:
   npx prisma migrate deploy
   npx prisma generate
   npm run build

5. Start local app and test a batch product.

TEST EXAMPLE — FRESH PEPPER
---------------------------
If you already have Fresh Pepper:
- Set count stock to 0.
- Set flexible weight stock to 0 if any exists.

If creating a new product with the current Add Product form:
- Base unit can remain Kg (or your normal unit).
- Base stock must be 0 for batch mode.
- The existing standard sale-unit configuration is retained for compatibility, but it is hidden from Sales while an active batch exists.

Then:
Products -> Fresh Pepper -> Flexible / Batch Selling

Batch / Container Selling:
Container type: Basket
Total purchase cost: e.g. 18000
Reference: optional
Note: optional
Click: Start New Batch

At Sales select Fresh Pepper.
You should see:
[ ₦200 ] [ ₦300 ] [ ₦500 ]
Other amount [        ] [ Add Amount Sale ]

You should NOT see the normal standard/weight/piece selling cards while that batch is active.

Example sales:
₦500
₦200
₦300
₦700 custom

The batch modal should show sales so far increasing.
When the physical basket is finished:
Products -> Fresh Pepper -> Flexible / Batch Selling -> Close / Finish Batch

Example:
Purchase cost = ₦18,000
Total sales = ₦25,400
Final batch profit = ₦7,400

After closing, you can start the next basket/crate/bag as a new batch with its own purchase cost.

LOW STOCK
---------
Because batch goods are not measured, the system cannot automatically know how much is left.
Use "Mark Low" when the physical basket/crate/bag is visibly low.
Use "Close / Finish Batch" only when the batch is physically finished (or you deliberately decide to close it).

IMPORTANT LIMITATION
--------------------
The current Products list still primarily displays the normal Product.stock count badge.
For a batch product, that base stock is intentionally 0, so the list may visually say Out even while a ProductBatch is active.
This does NOT stop batch sales: the Sales page uses activeBatch and works correctly.
A later UI polish can make the Products/Inventory cards show ACTIVE BATCH / LOW BATCH instead of the count-stock badge.

ZERO-SALE BATCH NOTE
--------------------
If you close a batch with zero sales, ProductBatch will correctly record closedProfit = -totalCost.
There are no SaleItem rows to allocate that loss into, so sale-line-based reports will not include that zero-sale spoilage loss automatically. The batch history still preserves it.
A future expense/spoilage integration can post that special case into business expenses automatically.
