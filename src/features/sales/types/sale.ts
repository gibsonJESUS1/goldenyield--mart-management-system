export type PaymentStatus = "paid" | "partial" | "owed";

export type SaleProduct = {
  id: string;
  name: string;
  price: number;
  ownerName: string;
  unit: string;
  stock: number;
};

export type SaleItem = {
  productId: string;
  name: string;
  ownerName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  total: number;
};

export type SaleRecord = {
  id: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
};
