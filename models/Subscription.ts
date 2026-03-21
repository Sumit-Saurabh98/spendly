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
  isAutoDetected: boolean;
  lastDetectedAt?: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    frequency: { type: String, enum: ["monthly", "weekly", "yearly"], default: "monthly" },
    startDate: { type: Date, default: Date.now },
    nextBillingDate: { type: Date },
    isActive: { type: Boolean, default: true },
    isAutoDetected: { type: Boolean, default: false },
    lastDetectedAt: { type: Date },
  },
  { timestamps: true }
);

if (mongoose.models.Subscription) {
  delete (mongoose as any).models.Subscription;
}

export const SubscriptionModel = mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
