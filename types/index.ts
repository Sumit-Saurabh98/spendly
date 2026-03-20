export interface Expense {
  _id?: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt?: string;
}

export interface Budget {
  _id?: string;
  dailyBudget: number;
  updatedAt?: string;
}

export interface ExpenseSummary {
  totalDaily: number;
  totalMonthly: number;
  totalYearly: number;
  dailyBudget: number;
  monthlyBudget: number;
  yearlyBudget: number;
}

export const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Health",
  "Bills & Utilities",
  "Education",
  "Travel",
  "Groceries",
  "Other",
];
