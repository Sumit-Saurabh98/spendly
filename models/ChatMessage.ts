import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, expires: 2592000 }, // Auto-delete after 30 days
});

export const ChatMessageModel = mongoose.models.ChatMessage || mongoose.model("ChatMessage", ChatMessageSchema);
