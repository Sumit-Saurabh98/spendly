import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ExpenseModel } from "@/models/Expense";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = req.headers.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const period = searchParams.get("period"); // "day", "month", "year", "all"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Use Asia/Kolkata timezone for date calculations
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) =>
      parseInt(parts.find((p) => p.type === type)?.value || "0");

    const year = getPart("year");
    const month = getPart("month") - 1; // 0-indexed
    const day = getPart("day");

    // Start of the current day in Kolkata (in UTC)
    const today = new Date(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`,
    );
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const monthStart = new Date(
      `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00+05:30`,
    );
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const yearStart = new Date(`${year}-01-01T00:00:00+05:30`);
    const nextYear = new Date(yearStart);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    let dateFilter: any = {};

    if (period === "day") {
      dateFilter = { $gte: today, $lt: tomorrow };
    } else if (period === "month") {
      dateFilter = { $gte: monthStart, $lt: nextMonth };
    } else if (period === "year") {
      dateFilter = { $gte: yearStart, $lt: nextYear };
    }

    const query = {
      userId,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    };

    const [expenses, total] = await Promise.all([
      ExpenseModel.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ExpenseModel.countDocuments(query),
    ]);

    // Summaries utilizing the same date boundaries
    const [dailyAgg, monthlyAgg, yearlyAgg, allTimeAgg, subscriptionsAgg] =
      await Promise.all([
        ExpenseModel.aggregate([
          {
            $match: {
              userId,
              date: { $gte: today, $lt: tomorrow },
              subscriptionId: null,
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        ExpenseModel.aggregate([
          {
            $match: {
              userId,
              date: { $gte: monthStart, $lt: nextMonth },
              subscriptionId: null,
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        ExpenseModel.aggregate([
          {
            $match: {
              userId,
              date: { $gte: yearStart, $lt: nextYear },
              subscriptionId: null,
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        ExpenseModel.aggregate([
          { $match: { userId, subscriptionId: null } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        ExpenseModel.aggregate([
          {
            $match: {
              userId,
              date: { $gte: monthStart, $lt: nextMonth },
              subscriptionId: { $ne: null },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

    // Category breakdown for charts (limited to current year) - EXCLUDING subscriptions
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const categoryWeek = await ExpenseModel.aggregate([
      { $match: { userId, date: { $gte: weekStart }, subscriptionId: null } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const categoryMonth = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: monthStart, $lt: nextMonth },
          subscriptionId: null,
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const categoryYear = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: yearStart, $lt: nextYear },
          subscriptionId: null,
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Daily spending trend (last 30 days) - EXCLUDING subscriptions
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const dailyTrend = await ExpenseModel.aggregate([
      {
        $match: { userId, date: { $gte: thirtyDaysAgo }, subscriptionId: null },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Top single expense this month - EXCLUDING subscriptions
    const maxExpense = await ExpenseModel.findOne({
      userId,
      date: { $gte: monthStart, $lt: nextMonth },
      subscriptionId: null,
    })
      .sort({ amount: -1 })
      .limit(1)
      .lean();

    // 1. Avg Daily Spending (last 30 days) - EXCLUDING subscriptions
    const avgDailyAgg = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: thirtyDaysAgo, $lt: tomorrow },
          subscriptionId: null,
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$date" },
            month: { $month: "$date" },
            year: { $year: "$date" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $group: { _id: null, avg: { $avg: "$total" } } },
    ]);
    const avgDaily = avgDailyAgg[0]?.avg || 0;

    // Monthly trend (last 12 months) - EXCLUDING subscriptions
    const twelveMonthsAgo = new Date(monthStart);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    const monthlyTrend = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: twelveMonthsAgo },
          subscriptionId: null,
        },
      },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Weekly pattern (day of week) - EXCLUDING subscriptions
    const weeklyAgg = await ExpenseModel.aggregate([
      {
        $match: { userId, date: { $gte: thirtyDaysAgo }, subscriptionId: null },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$date" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Weekly trend (last 7 days - date wise) - EXCLUDING subscriptions
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    const weeklyTrend = await ExpenseModel.aggregate([
      {
        $match: { userId, date: { $gte: sevenDaysAgo }, subscriptionId: null },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Yearly trend (last 52 weeks - week wise) - EXCLUDING subscriptions
    const fiftyTwoWeeksAgo = new Date(today);
    fiftyTwoWeeksAgo.setDate(today.getDate() - 364);
    const yearlyWeeklyTrend = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: fiftyTwoWeeksAgo },
          subscriptionId: null,
        },
      },
      {
        $group: {
          _id: { year: { $year: "$date" }, week: { $week: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    // MoM Comparison: Current Month vs Last Month - EXCLUDING subscriptions
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(monthStart);

    const lastMonthAgg = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: lastMonthStart, $lt: lastMonthEnd },
          subscriptionId: null,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const lastMonthCategories = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: lastMonthStart, $lt: lastMonthEnd },
          subscriptionId: null,
        },
      },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]);

    return NextResponse.json({
      expenses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: {
        daily: dailyAgg[0]?.total || 0,
        monthly: monthlyAgg[0]?.total || 0,
        yearly: yearlyAgg[0]?.total || 0,
        allTime: allTimeAgg[0]?.total || 0,
        subscriptionTotal: subscriptionsAgg[0]?.total || 0,
        maxExpense: maxExpense || null,
        avgDaily,
        topCategoryWeek: categoryWeek[0] || null,
        comparison: {
          thisMonth: {
            total: monthlyAgg[0]?.total || 0,
            categories: categoryMonth,
          },
          lastMonth: {
            total: lastMonthAgg[0]?.total || 0,
            categories: lastMonthCategories,
          },
        },
        forecast: (() => {
          const totalDays = new Date(year, month + 1, 0).getDate();
          const spent = monthlyAgg[0]?.total || 0;
          const currentDay = day; // 1-indexed
          const projected = (spent / currentDay) * totalDays;
          const daysRemaining = Math.max(totalDays - currentDay, 1);

          return {
            projected,
            totalDays,
            currentDay,
            daysRemaining,
            isOvershooting: false,
          };
        })(),
      },
      charts: {
        categories: {
          week: categoryWeek,
          month: categoryMonth,
          year: categoryYear,
        },
        dailyTrend, // 30 days
        monthlyTrend, // 12 months
        weeklyTrend, // 7 days
        yearlyWeeklyTrend, // 52 weeks
        weekdayPattern: weeklyAgg,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.headers.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { amount, category, description, date, location } = body;

    if (!amount || !category || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const expense = await ExpenseModel.create({
      userId,
      amount: parseFloat(amount),
      category,
      description,
      date: date ? new Date(`${date}T00:00:00+05:30`) : new Date(),
      location,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.headers.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const deleted = await ExpenseModel.findOneAndDelete({ _id: id, userId });
    if (!deleted)
      return NextResponse.json(
        { error: "Expense not found or unauthorized" },
        { status: 404 },
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
