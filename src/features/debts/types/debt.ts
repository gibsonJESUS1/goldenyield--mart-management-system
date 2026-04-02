export type DebtStatus = "outstanding" | "partial" | "cleared";

export type DebtTransactionType = "debt_added" | "payment_made";

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
