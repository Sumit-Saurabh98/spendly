import { NextRequest, NextResponse } from "next/server";
import { sendBreachEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    const { amount, monthBudget, description } = await req.json();
    
    if (!amount || !monthBudget || !description) {
      return NextResponse.json({ success: false, error: "Missing information" }, { status: 400 });
    }

    await sendBreachEmail(amount, monthBudget, description);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Email Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
