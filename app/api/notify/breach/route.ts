import { NextRequest, NextResponse } from "next/server";
import { sendBreachEmail } from "@/lib/mail";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, monthBudget, description } = await req.json();
    
    if (!amount || !monthBudget || !description) {
      return NextResponse.json({ success: false, error: "Missing information" }, { status: 400 });
    }

    await connectDB();
    const user = await UserModel.findById(userId);
    if (!user || !user.email) {
      return NextResponse.json({ success: false, error: "User not found or email missing" }, { status: 404 });
    }

    await sendBreachEmail(user.email, amount, monthBudget, description);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Email Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
