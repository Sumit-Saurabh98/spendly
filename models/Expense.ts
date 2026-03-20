import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export const ExpenseModel =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
