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

    return NextResponse.json(user);
  } catch (error) {
    console.error("Fetch User Error:", error);
    return NextResponse.json({ error: "Failed to fetch user settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { currency, currencySymbol, country, timezone, dailyBudget, monthlyIncidentalBudget } = body;

    const updateData: any = {};
    if (currency) updateData.currency = currency;
    if (currencySymbol) updateData.currencySymbol = currencySymbol;
    if (country) updateData.country = country;
    if (timezone) updateData.timezone = timezone;
    
    if (dailyBudget) {
      updateData.dailyBudget = dailyBudget;
      updateData.monthlyBudget = dailyBudget * 30;
      updateData.yearlyBudget = dailyBudget * 365;
    }
    
    if (monthlyIncidentalBudget) {
      updateData.monthlyIncidentalBudget = monthlyIncidentalBudget;
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Update User Error:", error);
    return NextResponse.json({ error: "Failed to update user settings" }, { status: 500 });
  }
}
