import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await UserModel.findById(userId).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ dailyBudget: user.dailyBudget, monthlyBudget: user.monthlyBudget, yearlyBudget: user.yearlyBudget });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { dailyBudget } = await req.json();
    if (!dailyBudget || dailyBudget <= 0) {
      return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { 
        dailyBudget,
        monthlyBudget: dailyBudget * 30, // Auto-update for simplicity or keep separate
        yearlyBudget: dailyBudget * 365
      },
      { new: true }
    );

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ dailyBudget: user.dailyBudget });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
  }
}
