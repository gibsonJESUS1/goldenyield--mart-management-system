FRIED PANLA / PIECE PRICE-COST BANDS
====================================

PURPOSE
-------
This update adds configured piece/portion price bands for flexible fish/meat sales.

Example use case:
- Fried Panla Small: sells for N200, has its own cost
- Fried Panla Medium: sells for N500, has its own cost
- Fried Panla Large: sells for N1,000, has its own cost

The exact cost values must come from your real batch costing. Do not use example costs blindly.

Sawa remains supported:
- If no configured portion options are added, variable-piece selling still uses the existing manual price range and currentCostPrice as the fallback cost per whole piece.

WHAT CHANGED
------------
1. New ProductPiecePriceOption table:
   - label
   - sellingPrice
   - costPrice
   - sortOrder
   - active

2. SaleItem now stores piecePriceLabel as a historical snapshot.

3. Flexible Fish / Meat setup now supports configured portion options.

4. Sales page lets cashier select a configured portion price.
   Cost is NOT exposed to cashier.

5. Sale backend ignores client-entered cost and loads the configured option from the database.
   It snapshots line cost/profit at the time of sale.

6. Existing manual Sawa piece-price flow continues to work.

TEST DATABASE FIRST
-------------------
Keep BOTH local URLs on TEST / late-leaf before doing the following:

DATABASE_URL -> TEST late-leaf pooled
DIRECT_URL   -> TEST late-leaf direct

Do NOT use prisma migrate dev.

After copying the files into your project:

1. Check migration status:
   npx prisma migrate status

2. Apply the new migration to TEST:
   npx prisma migrate deploy

3. Regenerate Prisma Client:
   npx prisma generate

4. Build:
   npm run build

5. Start/test locally.

HOW TO ADD FRIED PANLA
----------------------
First add it as a separate product from raw Panla:

Product name: Fried Panla
Base stock unit: Piece
Base selling price: N200 (if N200 is your smallest normal portion)
Base cost price: use the real cost of the smallest/base N200 portion, NOT N3,000 divided by the number of whole raw fish.

Important:
Count stock should mean the number of FINISHED SALEABLE PORTIONS after cutting/frying.

Example:
If today's finished batch gives 35 saleable portions, count stock = 35 Pieces.

Then open:
Products -> Fried Panla -> Fish / Meat Selling

Enable:
Sell individual pieces / portions by size

Add configured options such as:
- Small | Selling N200 | Cost N___
- Medium-small | Selling N300 | Cost N___
- Medium | Selling N500 | Cost N___
- Large | Selling N700 | Cost N___
- Extra Large | Selling N1,000 | Cost N___

Enter your real cost for each portion band from your actual production/batch costing.
The system blocks any configured selling price below its own cost.

HOW COST IS USED
----------------
Configured Panla option:
Sale price comes from ProductPiecePriceOption.sellingPrice.
Cost comes from ProductPiecePriceOption.costPrice.
Profit = sale total - option cost total.

Manual Sawa piece sale:
Sale price is entered by cashier.
Cost uses Product.currentCostPrice.

Weight sale:
Sale price uses pricePerKg.
Cost uses costPerKg.

HISTORICAL SAFETY
-----------------
The sale item snapshots:
- unitPrice
- unitCostPrice
- lineCostTotal
- lineProfit
- piecePriceLabel

Therefore changing a portion option later does NOT rewrite old sales or old profit.

LIVE DEPLOYMENT
---------------
Do not push to production until this works on TEST.

After TEST passes:
1. Keep DATABASE_URL on TEST locally.
2. Temporarily point DIRECT_URL to LIVE only.
3. Run: npx prisma migrate status
4. Confirm only 20261023162000_add_piece_price_bands is pending.
5. Run: npx prisma migrate deploy
6. Run: npx prisma migrate status
7. Put DIRECT_URL back to TEST.
8. Push code to main / Vercel.

Never run prisma migrate dev against LIVE.
