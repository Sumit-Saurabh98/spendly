import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  userId: string;
  amount: number;
  category: string;
  description: string;
  type: "daily" | "incidental" | "subscription";
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
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ["daily", "incidental", "subscription"], default: "daily" },
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

export const ExpenseModel = mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
