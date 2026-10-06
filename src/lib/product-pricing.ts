export type PricingPriceRule = {
  quantity: number;
  price: number;
  active?: boolean;
};

export type PricingSaleUnit = {
  unitId: string;
  quantityInBaseUnit: number;
  sellingPrice: number;
  active?: boolean;
  priceRules?: PricingPriceRule[];
};

export type PricingWarning = {
  type:
    | "SELLING_PRICE_BELOW_COST"
    | "PRICE_RULE_BELOW_COST";

  saleUnitIndex: number;
  ruleIndex?: number;

  sellingPrice: number;
  costAmount: number;
  lossAmount: number;

  message: string;
};

export class ProductPricingError extends Error {
  warnings: PricingWarning[];

  constructor(
    message: string,
    warnings: PricingWarning[] = [],
  ) {
    super(message);

    this.name = "ProductPricingError";
    this.warnings = warnings;
  }
}

function money(value: number) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}

export function getPricingWarnings(
  costPricePerBaseUnit: number | null | undefined,
  saleUnits: PricingSaleUnit[],
): PricingWarning[] {
  if (
    costPricePerBaseUnit == null ||
    !Number.isFinite(
      costPricePerBaseUnit,
    ) ||
    costPricePerBaseUnit <= 0
  ) {
    return [];
  }

  const warnings: PricingWarning[] = [];

  saleUnits.forEach(
    (saleUnit, saleUnitIndex) => {
      if (saleUnit.active === false) {
        return;
      }

      const unitCost = money(
        costPricePerBaseUnit *
          saleUnit.quantityInBaseUnit,
      );

      const sellingPrice = money(
        saleUnit.sellingPrice,
      );

      if (sellingPrice < unitCost) {
        const lossAmount = money(
          unitCost - sellingPrice,
        );

        warnings.push({
          type:
            "SELLING_PRICE_BELOW_COST",

          saleUnitIndex,

          sellingPrice,
          costAmount: unitCost,
          lossAmount,

          message:
            `Selling unit ${saleUnitIndex + 1} costs ₦${unitCost.toLocaleString()} ` +
            `but sells for ₦${sellingPrice.toLocaleString()}. ` +
            `This would lose ₦${lossAmount.toLocaleString()} per unit sold.`,
        });
      }

      const priceRules =
        saleUnit.priceRules ?? [];

      priceRules.forEach(
        (rule, ruleIndex) => {
          if (rule.active === false) {
            return;
          }

          const ruleCost = money(
            unitCost * rule.quantity,
          );

          const rulePrice = money(
            rule.price,
          );

          if (rulePrice < ruleCost) {
            const lossAmount = money(
              ruleCost - rulePrice,
            );

            warnings.push({
              type:
                "PRICE_RULE_BELOW_COST",

              saleUnitIndex,
              ruleIndex,

              sellingPrice: rulePrice,
              costAmount: ruleCost,
              lossAmount,

              message:
                `Selling unit ${saleUnitIndex + 1}, quantity rule ${rule.quantity}: ` +
                `cost is ₦${ruleCost.toLocaleString()} but the rule price is ` +
                `₦${rulePrice.toLocaleString()}. This would lose ` +
                `₦${lossAmount.toLocaleString()}.`,
            });
          }
        },
      );
    },
  );

  return warnings;
}

export function assertSellingPricesNotBelowCost(
  costPricePerBaseUnit: number | null | undefined,
  saleUnits: PricingSaleUnit[],
) {
  const warnings =
    getPricingWarnings(
      costPricePerBaseUnit,
      saleUnits,
    );

  if (warnings.length === 0) {
    return;
  }

  throw new ProductPricingError(
    warnings[0].message,
    warnings,
  );
}