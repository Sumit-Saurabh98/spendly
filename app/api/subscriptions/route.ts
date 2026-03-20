import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SubscriptionModel } from "@/models/Subscription";
import { ExpenseModel } from "@/models/Expense";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const subscriptions = await SubscriptionModel.find({ isActive: true }).sort({ nextBillingDate: 1 });

    // Detection Logic: Scan last 90 days for patterns
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const expenses = await ExpenseModel.find({
      date: { $gte: ninetyDaysAgo }
    });

    // Group by description
    const groups: { [key: string]: any[] } = {};
    expenses.forEach(ex => {
      const desc = ex.description.toLowerCase().trim();
      if (!groups[desc]) groups[desc] = [];
      groups[desc].push(ex);
    });

    const detected: any[] = [];
    for (const [desc, items] of Object.entries(groups)) {
      if (items.length < 2) continue;

      // Check for monthly pattern (different months)
      const months = new Set(items.map(ex => new Date(ex.date).getMonth()));
      if (months.size >= 2) {
        // Check for similar amounts (+/- 15%)
        const avgAmount = items.reduce((sum, item) => sum + item.amount, 0) / items.length;
        const reflectsConsistentAmount = items.every(item => Math.abs(item.amount - avgAmount) < avgAmount * 0.15);

        if (reflectsConsistentAmount) {
          // Check if already a subscription
          const exists = subscriptions.some(s => s.name.toLowerCase() === desc);
          if (!exists) {
            detected.push({
              name: items[0].description,
              amount: Math.round(avgAmount),
              category: items[0].category,
              frequency: "monthly",
              confidence: items.length >= 3 ? "high" : "medium",
              occurrences: items.length
            });
          }
        }
      }
    }

    return NextResponse.json({ subscriptions, detected });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, amount, category, frequency, nextBillingDate, isAutoDetected } = body;

    const subscription = await SubscriptionModel.create({
      name,
      amount,
      category,
      frequency: frequency || "monthly",
      nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : undefined,
      isAutoDetected: !!isAutoDetected
    });

    // Link existing expenses to this subscription
    await ExpenseModel.updateMany(
      { description: { $regex: new RegExp(`^${name}$`, "i") } },
      { $set: { subscriptionId: subscription._id } }
    );

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await SubscriptionModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
