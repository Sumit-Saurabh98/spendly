import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { OTPModel } from "@/models/OTP";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    await connectDB();

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP
    await OTPModel.findOneAndUpdate(
      { email },
      { code: otp, expiresAt },
      { upsert: true, new: true }
    );

    // Send Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Spendly" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your Spendly Verification Code",
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #1a1a1a; max-width: 400px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #7c5cfc; margin-bottom: 8px;">Verify your email</h2>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">Enter the code below to log in to your account.</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #1a1a1a; border: 1px solid #e2e8f0;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center;">This code will expire in 5 minutes.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("OTP Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
