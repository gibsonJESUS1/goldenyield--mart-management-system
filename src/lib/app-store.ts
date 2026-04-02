export type PaymentStatus = "paid" | "partial" | "owed";
export type DebtStatus = "outstanding" | "partial" | "cleared";
export type DebtTransactionType = "debt_added" | "payment_made";

export type AppProduct = {
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

export type DebtTransaction = {
  id: string;
  type: DebtTransactionType;
  amount: number;
  note: string;
  createdAt: string;
};

export type DebtRecord = {
  id: string;
  customerName: string;
  amountOwed: number;
  amountPaid: number;
  balance: number;
  status: DebtStatus;
  createdAt: string;
  transactions: DebtTransaction[];
};

export const appProducts: AppProduct[] = [
  {
    id: "1",
    name: "Garri",
    category: "Farm Produce",
    ownerName: "You",
    unit: "Paint Bucket",
    stock: 18,
    lowStock: 5,
    price: 2300,
    active: true,
  },
  {
    id: "2",
    name: "Indomie Jollof",
    category: "Provisions",
    ownerName: "Wife",
    unit: "Pieces",
    stock: 20,
    lowStock: 10,
    price: 300,
    active: true,
  },
  {
    id: "3",
    name: "Coke Bottle",
    category: "Drinks",
    ownerName: "Mum",
    unit: "Bottle",
    stock: 15,
    lowStock: 6,
    price: 500,
    active: true,
  },
  {
    id: "4",
    name: "Biscuit",
    category: "Provisions",
    ownerName: "Wife",
    unit: "Pieces",
    stock: 3,
    lowStock: 5,
    price: 100,
    active: true,
  },
  {
    id: "5",
    name: "Palm Oil",
    category: "Oil",
    ownerName: "You",
    unit: "Bottle",
    stock: 0,
    lowStock: 4,
    price: 1900,
    active: true,
  },
];

export const initialDebts: DebtRecord[] = [
  {
    id: "1",
    customerName: "Adebayo",
    amountOwed: 5000,
    amountPaid: 2000,
    balance: 3000,
    status: "partial",
    createdAt: "2026-03-24 10:30",
    transactions: [
      {
        id: "t1",
        type: "debt_added",
        amount: 5000,
        note: "Initial credit sale",
        createdAt: "2026-03-24 10:30",
      },
      {
        id: "t2",
        type: "payment_made",
        amount: 2000,
        note: "Part payment received",
        createdAt: "2026-03-24 13:00",
      },
    ],
  },
];
