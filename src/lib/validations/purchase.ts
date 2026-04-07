import { z } from "zod";

export const createPurchaseSchema = z.object({
  reference: z.string().trim().optional().or(z.literal("")),
  supplierName: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
  purchasedAt: z.string().optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        quantityInBaseUnit: z.coerce
          .number()
          .int("Quantity must be a whole number")
          .positive("Quantity must be greater than 0"),
        unitCostPrice: z.coerce
          .number()
          .positive("Cost price must be greater than 0"),
      }),
    )
    .min(1, "At least one purchase item is required"),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
