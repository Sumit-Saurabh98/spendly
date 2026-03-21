import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
  userId: string;
  name: string;
  amount: number;
  category: string;
  frequency: "monthly" | "weekly" | "yearly";
  startDate: Date;
  nextBillingDate: Date;
  isActive: boolean;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    frequency: { type: String, enum: ["monthly", "weekly", "yearly"], default: "monthly" },
    startDate: { type: Date, required: true, default: Date.now },
    nextBillingDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SubscriptionModel = mongoose.models.Subscription || mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
