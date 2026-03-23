import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, expires: 2592000 },
});

export const ChatMessageModel = mongoose.models.ChatMessage || mongoose.model("ChatMessage", ChatMessageSchema);
