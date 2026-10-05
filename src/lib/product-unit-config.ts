export type ProductPriceRuleInput = {
  quantity: number;
  price: number;
  active?: boolean;
};

export type ProductSaleUnitConfig = {
  id?: string;

  unitId: string;

  quantityInBaseUnit: number;

  sellingPrice: number;

  isDefault?: boolean;

  active?: boolean;

  priceRules?: ProductPriceRuleInput[];
};

export class ProductUnitConfigurationError extends Error {
  constructor(message: string) {
    super(message);

    this.name =
      "ProductUnitConfigurationError";
  }
}

export function createBaseSaleUnit(
  baseUnitId: string,
): ProductSaleUnitConfig {
  return {
    unitId: baseUnitId,

    quantityInBaseUnit: 1,

    sellingPrice: 0,

    isDefault: true,

    active: true,

    priceRules: [],
  };
}

export function prepareSaleUnitsForEditor(
  baseUnitId: string,
  saleUnits: ProductSaleUnitConfig[],
): ProductSaleUnitConfig[] {
  if (!baseUnitId) {
    return [];
  }

  const existingBaseUnit =
    saleUnits.find(
      (unit) =>
        unit.unitId === baseUnitId,
    );

  const otherUnits =
    saleUnits.filter(
      (unit) =>
        unit.unitId !== baseUnitId,
    );

  const baseUnit =
    existingBaseUnit
      ? {
          ...existingBaseUnit,

          quantityInBaseUnit: 1,

          active: true,
        }
      : createBaseSaleUnit(
          baseUnitId,
        );

  let result = [
    baseUnit,
    ...otherUnits,
  ];

  const defaultCount =
    result.filter(
      (unit) =>
        unit.isDefault === true &&
        unit.active !== false,
    ).length;

  if (defaultCount !== 1) {
    result = result.map(
      (unit, index) => ({
        ...unit,

        isDefault:
          index === 0,
      }),
    );
  }

  return result;
}

export function validateProductUnitConfiguration(
  baseUnitId: string,
  saleUnits: ProductSaleUnitConfig[],
): string {
  if (!baseUnitId) {
    return "Base stock unit is required.";
  }

  if (
    !Array.isArray(saleUnits) ||
    saleUnits.length === 0
  ) {
    return "At least one selling unit is required.";
  }

  const baseRows =
    saleUnits.filter(
      (unit) =>
        unit.unitId === baseUnitId,
    );

  if (baseRows.length === 0) {
    return "The base stock unit must also exist as a selling unit.";
  }

  if (baseRows.length > 1) {
    return "The base stock unit cannot appear more than once.";
  }

  const baseRow =
    baseRows[0];

  if (
    baseRow.quantityInBaseUnit !== 1
  ) {
    return "The base-unit selling row must always equal exactly 1 base unit.";
  }

  if (
    baseRow.active === false
  ) {
    return "The base-unit selling row must remain active.";
  }

  const defaultUnits =
    saleUnits.filter(
      (unit) =>
        unit.isDefault === true &&
        unit.active !== false,
    );

  if (
    defaultUnits.length !== 1
  ) {
    return "Exactly one active selling unit must be selected as the default.";
  }

  const seenUnitIds =
    new Set<string>();

  for (
    let i = 0;
    i < saleUnits.length;
    i += 1
  ) {
    const saleUnit =
      saleUnits[i];

    const rowLabel =
      `Selling unit ${i + 1}`;

    if (!saleUnit.unitId) {
      return `${rowLabel}: unit is required.`;
    }

    if (
      seenUnitIds.has(
        saleUnit.unitId,
      )
    ) {
      return "The same selling unit cannot be added more than once.";
    }

    seenUnitIds.add(
      saleUnit.unitId,
    );

    if (
      !Number.isInteger(
        saleUnit.quantityInBaseUnit,
      ) ||
      saleUnit.quantityInBaseUnit <=
        0
    ) {
      return `${rowLabel}: quantity in base unit must be a whole number greater than 0.`;
    }

    if (
      !Number.isFinite(
        saleUnit.sellingPrice,
      ) ||
      saleUnit.sellingPrice <= 0
    ) {
      return `${rowLabel}: selling price must be greater than 0.`;
    }

    if (
      saleUnit.isDefault ===
        true &&
      saleUnit.active === false
    ) {
      return `${rowLabel}: an inactive selling unit cannot be the default.`;
    }

    const priceRules =
      saleUnit.priceRules ??
      [];

    const seenRuleQuantities =
      new Set<number>();

    for (
      let j = 0;
      j < priceRules.length;
      j += 1
    ) {
      const rule =
        priceRules[j];

      if (
        !Number.isInteger(
          rule.quantity,
        ) ||
        rule.quantity <= 0
      ) {
        return `${rowLabel}: price-rule quantity must be a whole number greater than 0.`;
      }

      if (
        seenRuleQuantities.has(
          rule.quantity,
        )
      ) {
        return `${rowLabel}: duplicate price-rule quantities are not allowed.`;
      }

      seenRuleQuantities.add(
        rule.quantity,
      );

      if (
        !Number.isFinite(
          rule.price,
        ) ||
        rule.price <= 0
      ) {
        return `${rowLabel}: price-rule amount must be greater than 0.`;
      }

      const normalTotal =
        saleUnit.sellingPrice *
        rule.quantity;

      if (
        rule.price >
        normalTotal
      ) {
        return `${rowLabel}: price-rule amount cannot exceed the normal total price for that quantity.`;
      }
    }
  }

  return "";
}

export function assertValidProductUnitConfiguration(
  baseUnitId: string,
  saleUnits: ProductSaleUnitConfig[],
) {
  const error =
    validateProductUnitConfiguration(
      baseUnitId,
      saleUnits,
    );

  if (error) {
    throw new ProductUnitConfigurationError(
      error,
    );
  }
}