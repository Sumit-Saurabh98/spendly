import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  dailyBudget: number;
  monthlyBudget: number;
  monthlyIncidentalBudget: number;
  yearlyBudget: number;
  maxStreak: number;
  isOnboarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    dailyBudget: { type: Number, default: 100 },
    monthlyBudget: { type: Number, default: 3000 },
    monthlyIncidentalBudget: { type: Number, default: 1000 },
    yearlyBudget: { type: Number, default: 36500 },
    maxStreak: { type: Number, default: 0 },
    isOnboarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
