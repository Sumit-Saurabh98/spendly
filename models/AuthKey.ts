import mongoose from "mongoose";

const AuthKeySchema = new mongoose.Schema({
  secret: { type: String, required: true },
});

// Explicitly mapping to the "key" collection as specified by user
export const AuthKeyModel = mongoose.models.AuthKey || mongoose.model("AuthKey", AuthKeySchema, "key");
