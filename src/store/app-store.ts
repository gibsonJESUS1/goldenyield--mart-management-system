import { create } from "zustand";

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

type AppStore = {
  products: AppProduct[];
  sales: SaleRecord[];
  debts: DebtRecord[];
  restockHistory: RestockRecord[];

  saveSale: (payload: {
    customerName: string;
    items: SaleItem[];
    paymentStatus: PaymentStatus;
    amountPaid: number;
  }) => void;

  addDebtPayment: (payload: {
    debtId: string;
    amount: number;
    note: string;
  }) => void;

  addMoreDebt: (payload: {
    debtId: string;
    amount: number;
    note: string;
  }) => void;

  restockProduct: (payload: {
    productId: string;
    quantityAdded: number;
    note: string;
  }) => void;
};

function resolveDebtStatus(balance: number, amountPaid: number): DebtStatus {
  if (balance <= 0) return "cleared";
  if (amountPaid > 0) return "partial";
  return "outstanding";
}

export const useAppStore = create<AppStore>((set) => ({
  products: [
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
  ],

  sales: [],

  debts: [
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
  ],

  restockHistory: [],

  saveSale: ({ customerName, items, paymentStatus, amountPaid }) =>
    set((state) => {
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);

      const resolvedCustomerName = customerName.trim() || "Walk-in Customer";
      const resolvedAmountPaid =
        paymentStatus === "paid"
          ? subtotal
          : paymentStatus === "owed"
            ? 0
            : amountPaid;

      const balance =
        paymentStatus === "paid"
          ? 0
          : Math.max(subtotal - resolvedAmountPaid, 0);

      const newSale: SaleRecord = {
        id: crypto.randomUUID(),
        customerName: resolvedCustomerName,
        items,
        subtotal,
        amountPaid: resolvedAmountPaid,
        balance,
        paymentStatus,
        createdAt: new Date().toLocaleString(),
      };

      let nextDebts = [...state.debts];

      if (balance > 0) {
        const existingDebt = nextDebts.find(
          (debt) =>
            debt.customerName.toLowerCase() ===
            resolvedCustomerName.toLowerCase(),
        );

        if (existingDebt) {
          nextDebts = nextDebts.map((debt) => {
            if (debt.id !== existingDebt.id) return debt;

            const nextAmountOwed = debt.amountOwed + subtotal;
            const nextAmountPaid = debt.amountPaid + resolvedAmountPaid;
            const nextBalance = debt.balance + balance;

            return {
              ...debt,
              amountOwed: nextAmountOwed,
              amountPaid: nextAmountPaid,
              balance: nextBalance,
              status: resolveDebtStatus(nextBalance, nextAmountPaid),
              transactions: [
                {
                  id: crypto.randomUUID(),
                  type: "debt_added",
                  amount: balance,
                  note: `Debt added from sale on ${newSale.createdAt}`,
                  createdAt: new Date().toLocaleString(),
                },
                ...debt.transactions,
              ],
            };
          });
        } else {
          const newDebt: DebtRecord = {
            id: crypto.randomUUID(),
            customerName: resolvedCustomerName,
            amountOwed: subtotal,
            amountPaid: resolvedAmountPaid,
            balance,
            status: resolveDebtStatus(balance, resolvedAmountPaid),
            createdAt: newSale.createdAt,
            transactions: [
              {
                id: crypto.randomUUID(),
                type: "debt_added",
                amount: balance,
                note: `Debt created from sale on ${newSale.createdAt}`,
                createdAt: new Date().toLocaleString(),
              },
            ],
          };

          nextDebts = [newDebt, ...nextDebts];
        }
      }

      const nextProducts = state.products.map((product) => {
        const soldItem = items.find((item) => item.productId === product.id);
        if (!soldItem) return product;

        return {
          ...product,
          stock: Math.max(product.stock - soldItem.quantity, 0),
        };
      });

      return {
        sales: [newSale, ...state.sales],
        debts: nextDebts,
        products: nextProducts,
      };
    }),

  addDebtPayment: ({ debtId, amount, note }) =>
    set((state) => ({
      debts: state.debts.map((debt) => {
        if (debt.id !== debtId) return debt;

        const safeAmount = Math.min(amount, debt.balance);
        const nextAmountPaid = debt.amountPaid + safeAmount;
        const nextBalance = Math.max(debt.balance - safeAmount, 0);

        return {
          ...debt,
          amountPaid: nextAmountPaid,
          balance: nextBalance,
          status: resolveDebtStatus(nextBalance, nextAmountPaid),
          transactions: [
            {
              id: crypto.randomUUID(),
              type: "payment_made",
              amount: safeAmount,
              note: note || "Payment received",
              createdAt: new Date().toLocaleString(),
            },
            ...debt.transactions,
          ],
        };
      }),
    })),

  addMoreDebt: ({ debtId, amount, note }) =>
    set((state) => ({
      debts: state.debts.map((debt) => {
        if (debt.id !== debtId) return debt;

        const nextAmountOwed = debt.amountOwed + amount;
        const nextBalance = debt.balance + amount;

        return {
          ...debt,
          amountOwed: nextAmountOwed,
          balance: nextBalance,
          status: resolveDebtStatus(nextBalance, debt.amountPaid),
          transactions: [
            {
              id: crypto.randomUUID(),
              type: "debt_added",
              amount,
              note: note || "Additional debt added",
              createdAt: new Date().toLocaleString(),
            },
            ...debt.transactions,
          ],
        };
      }),
    })),

  restockProduct: ({ productId, quantityAdded, note }) =>
    set((state) => {
      let newRecord: RestockRecord | null = null;

      const nextProducts = state.products.map((product) => {
        if (product.id !== productId) return product;

        const newStock = product.stock + quantityAdded;

        newRecord = {
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          quantityAdded,
          previousStock: product.stock,
          newStock,
          note,
          createdAt: new Date().toLocaleString(),
        };

        return {
          ...product,
          stock: newStock,
        };
      });

      return {
        products: nextProducts,
        restockHistory: newRecord
          ? [newRecord, ...state.restockHistory]
          : state.restockHistory,
      };
    }),
}));
