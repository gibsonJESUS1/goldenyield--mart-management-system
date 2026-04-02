export type OwnerId = "owner_you" | "owner_wife" | "owner_mum";

export type Product = {
  id: string;
  name: string;
  category: string;
  ownerId: OwnerId;
  ownerName: string;
  unit: string;
  price: number;
  stock: number;
  lowStock: number;
  active: boolean;
};
