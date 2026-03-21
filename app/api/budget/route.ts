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

    return NextResponse.json({ 
      dailyBudget: user.dailyBudget, 
      monthlyBudget: user.monthlyBudget, 
      yearlyBudget: user.yearlyBudget,
      monthlyIncidentalBudget: user.monthlyIncidentalBudget || 1000 
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { dailyBudget, monthlyIncidentalBudget } = await req.json();
    
    const updateData: any = {};
    if (dailyBudget) {
      if (dailyBudget <= 0) {
        return NextResponse.json({ error: "Invalid daily budget" }, { status: 400 });
      }
      updateData.dailyBudget = dailyBudget;
      updateData.monthlyBudget = dailyBudget * 30;
      updateData.yearlyBudget = dailyBudget * 365;
    }
    if (monthlyIncidentalBudget) {
      if (monthlyIncidentalBudget <= 0) {
        return NextResponse.json({ error: "Invalid monthly incidental budget" }, { status: 400 });
      }
      updateData.monthlyIncidentalBudget = monthlyIncidentalBudget;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid budget data provided for update" }, { status: 400 });
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ 
      dailyBudget: user.dailyBudget,
      monthlyBudget: user.monthlyBudget,
      yearlyBudget: user.yearlyBudget,
      monthlyIncidentalBudget: user.monthlyIncidentalBudget
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
  }
}
