import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  amount: number;
  category: string;
  description: string;
  date: Date;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  subscriptionId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      name: { type: String },
    },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
  },
  { timestamps: true }
);

if (mongoose.models.Expense) {
  delete (mongoose as any).models.Expense;
}

export const ExpenseModel = mongoose.model<IExpense>("Expense", ExpenseSchema);
