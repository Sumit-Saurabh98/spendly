import mongoose, { Schema, Document } from "mongoose";

export interface IBudget extends Document {
  dailyBudget: number;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    dailyBudget: { type: Number, required: true, default: 100 },
  },
  { timestamps: true }
);

export const BudgetModel =
  mongoose.models.Budget || mongoose.model<IBudget>("Budget", BudgetSchema);
