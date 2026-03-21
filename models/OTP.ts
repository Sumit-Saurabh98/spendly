import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  email: string;
  code: string;
  expiresAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    email: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export const OTPModel = mongoose.models.OTP || mongoose.model<IOTP>("OTP", OTPSchema);
