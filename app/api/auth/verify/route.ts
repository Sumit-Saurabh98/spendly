import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { OTPModel } from "@/models/OTP";
import { UserModel } from "@/models/User";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ error: "Email and code are required" }, { status: 400 });

    await connectDB();

    // Verify OTP
    const storedOTP = await OTPModel.findOne({ email, code });
    if (!storedOTP) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

    // Check if OTP is expired (though MongoDB index handles auto-delete, defensive check is good)
    if (storedOTP.expiresAt < new Date()) {
      await OTPModel.deleteOne({ _id: storedOTP._id });
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    // OTP is valid, clear it
    await OTPModel.deleteOne({ _id: storedOTP._id });

    // Find or Create User
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({
        email,
        dailyBudget: 100,
        monthlyBudget: 3000,
        yearlyBudget: 36500,
      });
    }

    // In a real app, we'd issue a JWT here. 
    // For this implementation, we'll return the user object and the frontend will manage session.
    
    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        dailyBudget: user.dailyBudget,
      }
    });
  } catch (err: any) {
    console.error("Verify Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
