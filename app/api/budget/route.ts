import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { BudgetModel } from "@/models/Budget";

export async function GET() {
  try {
    await connectDB();
    let budget = await BudgetModel.findOne().sort({ updatedAt: -1 }).lean();
    if (!budget) {
      budget = await BudgetModel.create({ dailyBudget: 100 });
    }
    return NextResponse.json(budget);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { dailyBudget } = await req.json();
    if (!dailyBudget || dailyBudget <= 0) {
      return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
    }

    let budget = await BudgetModel.findOne();
    if (budget) {
      budget.dailyBudget = dailyBudget;
      await budget.save();
    } else {
      budget = await BudgetModel.create({ dailyBudget });
    }

    return NextResponse.json(budget);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
  }
}
