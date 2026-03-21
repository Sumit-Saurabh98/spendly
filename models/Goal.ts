import mongoose, { Schema, Document } from "mongoose";

export interface IGoal extends Document {
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category?: string;
  deadline?: Date;
  status: "active" | "completed" | "paused";
  color?: string;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    category: { type: String },
    deadline: { type: Date },
    status: { type: String, enum: ["active", "completed", "paused"], default: "active" },
    color: { type: String, default: "#7c5cfc" },
  },
  { timestamps: true }
);

if (mongoose.models.Goal) {
  delete (mongoose as any).models.Goal;
}

export const GoalModel = mongoose.model<IGoal>("Goal", GoalSchema);
