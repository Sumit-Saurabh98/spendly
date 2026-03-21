import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SubscriptionModel } from "@/models/Subscription";
import { ExpenseModel } from "@/models/Expense";

function calculateNextBillingDate(startDate: Date, frequency: string, latestPaymentDate: Date | undefined, tz: string): Date {
  const toDateString = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  
  const start = new Date(startDate);
  const startStr = toDateString(start, tz);
  
  if (!latestPaymentDate) return start;
  const latestStr = toDateString(latestPaymentDate, tz);
  
  if (latestStr < startStr) return start;

  let iterations = 0;
  let next = new Date(start);
  
  while (toDateString(next, tz) <= latestStr) {
    iterations++;
    next = new Date(start);
    if (frequency === "weekly") {
      next.setDate(start.getDate() + (iterations * 7));
    } else if (frequency === "yearly") {
      next.setFullYear(start.getFullYear() + iterations);
    } else {
      // monthly
      next.setMonth(start.getMonth() + iterations);
      if (next.getDate() !== start.getDate()) {
        next.setDate(0);
      }
    }
  }
  return next;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userTz = req.headers.get("x-timezone") || "UTC";
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const subscriptionsRaw = await SubscriptionModel.find({ userId });

    const subscriptions = await Promise.all(subscriptionsRaw.map(async (s) => {
      const history = await ExpenseModel.find({ subscriptionId: s._id }).sort({ date: -1 }).limit(10).lean();
      const latestPayment = history.length > 0 ? new Date(history[0].date) : undefined;
      const nextBillingDate = calculateNextBillingDate(s.startDate, s.frequency, latestPayment, userTz);
      
      return { 
        ...s.toObject(), 
        history,
        nextBillingDate 
      };
    }));

    // Sort by next billing date
    subscriptions.sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime());

    return NextResponse.json({ subscriptions, detected: [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { name, amount, category, frequency, startDate } = body;

    const subscription = await SubscriptionModel.create({
      userId,
      name,
      amount,
      category,
      frequency: frequency || "monthly",
      startDate: startDate ? new Date(startDate) : new Date(),
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { id, isActive } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const subscription = await SubscriptionModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isActive } },
      { new: true }
    );

    if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
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

    const deleted = await SubscriptionModel.findOneAndDelete({ _id: id, userId });
    if (!deleted) return NextResponse.json({ error: "Subscription not found or unauthorized" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
