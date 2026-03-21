import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { GoalModel } from "@/models/Goal";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const goals = await GoalModel.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json(goals);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { name, targetAmount, deadline, color } = body;

    const goal = await GoalModel.create({
      userId,
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
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { id, currentAmount, status } = body;

    const goal = await GoalModel.findOneAndUpdate(
      { _id: id, userId },
      { 
        ...(currentAmount !== undefined && { currentAmount }),
        ...(status !== undefined && { status })
      },
      { new: true }
    );

    if (!goal) return NextResponse.json({ error: "Goal not found or unauthorized" }, { status: 404 });

    return NextResponse.json(goal);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const deleted = await GoalModel.findOneAndDelete({ _id: id, userId });
    if (!deleted) return NextResponse.json({ error: "Goal not found or unauthorized" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
