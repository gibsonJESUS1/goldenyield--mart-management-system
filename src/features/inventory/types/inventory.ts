export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  ownerName: string;
  unit: string;
  stock: number;
  lowStock: number;
  price: number;
  active: boolean;
};

export type RestockRecord = {
  id: string;
  productId: string;
  productName: string;
  quantityAdded: number;
  previousStock: number;
  newStock: number;
  note: string;
  createdAt: string;
};
