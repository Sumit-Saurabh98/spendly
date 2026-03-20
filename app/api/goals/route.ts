import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { GoalModel } from "@/models/Goal";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const goals = await GoalModel.find().sort({ createdAt: -1 });
    return NextResponse.json(goals);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, targetAmount, deadline, color } = body;

    const goal = await GoalModel.create({
      name,
      targetAmount,
      deadline,
      color
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, currentAmount, status } = body;

    const goal = await GoalModel.findByIdAndUpdate(
      id,
      { 
        ...(currentAmount !== undefined && { currentAmount }),
        ...(status !== undefined && { status })
      },
      { new: true }
    );

    return NextResponse.json(goal);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await GoalModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
