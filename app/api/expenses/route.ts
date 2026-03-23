import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ExpenseModel } from "@/models/Expense";
import { UserModel } from "@/models/User";

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

    const userTz = req.headers.get("x-timezone") || "UTC";
    const now = new Date();
    
    // Helper to get formatted parts in user timezone
    const getParts = (date: Date) => {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: userTz,
        year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
        hour12: false
      });
      const p = formatter.formatToParts(date);
      const find = (type: string) => p.find(pt => pt.type === type)?.value;
      return {
        year: find("year"),
        month: find("month")?.padStart(2, "0"),
        day: find("day")?.padStart(2, "0")
      };
    };

    const p = getParts(now);
    
    // Create UTC objects representing the start of local periods
    // Note: Due to how Date works without TZ, we might need a better way if we want true local start.
    // However, for consistency with the existing logic, we can construct the date string.
    // To be truly accurate with the offset:
    const getOffset = (date: Date, tz: string) => {
      const s = date.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
      const m = s.match(/GMT([+-]\d+):?(\d+)?/);
      if (!m) return "+00:00";
      const sign = m[1].startsWith('-') ? '-' : '+';
      const hours = m[1].replace(/[+-]/, '').padStart(2, '0');
      const mins = (m[2] || "00").padStart(2, '0');
      return `${sign}${hours}:${mins}`;
    };
    
    const offset = getOffset(now, userTz);
    
    const today = new Date(`${p.year}-${p.month}-${p.day}T00:00:00${offset}`);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);

    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(today.getDate() - 364);

    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(today.getFullYear() - 5);

    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    const monthStart = new Date(`${p.year}-${p.month}-01T00:00:00${offset}`);
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const yearStart = new Date(`${p.year}-01-01T00:00:00${offset}`);
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

    const user = await UserModel.findOne({ _id: userId }) || { dailyBudget: 100, monthlyIncidentalBudget: 1000, maxStreak: 0 };
    const userDailyBudget = user.dailyBudget || 100;

    // Summaries utilizing the same date boundaries
    const [
      dailyAgg,
      dailyIncidentalAgg,
      monthlyAgg,
      monthlyIncidentalAgg,
      yearlyAgg,
      allTimeAgg,
      totalMonthAgg,
      totalSixMonthAgg,
      totalYearAgg,
      subscriptionsAgg,
    ] = await Promise.all([
      ExpenseModel.aggregate([
        {
          $match: {
            userId,
            date: { $gte: today, $lt: tomorrow },
            type: "daily",
            subscriptionId: null,
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      ExpenseModel.aggregate([
        {
          $match: {
            userId,
            date: { $gte: today, $lt: tomorrow },
            type: "incidental",
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
            type: "daily",
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
            type: "incidental",
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
            type: "daily",
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      ExpenseModel.aggregate([
        { $match: { userId, subscriptionId: null, type: "daily" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      ExpenseModel.aggregate([
        {
          $match: {
            userId,
            date: { $gte: monthStart, $lt: nextMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      ExpenseModel.aggregate([
        {
          $match: {
            userId,
            date: { $gte: sixMonthsAgo, $lt: tomorrow },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      ExpenseModel.aggregate([
        {
          $match: {
            userId,
            date: { $gte: yearStart, $lt: nextYear },
          },
        },
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

    // 3. Multi-Period Aggregations for Charts
    const getDailyTrend = async (startDate: Date) => {
      return await ExpenseModel.aggregate([
        { $match: { userId, date: { $gte: startDate }, subscriptionId: null, type: "daily" } },
        {
          $group: {
            _id: {
              year: { $year: { date: "$date", timezone: userTz } },
              month: { $month: { date: "$date", timezone: userTz } },
              day: { $dayOfMonth: { date: "$date", timezone: userTz } },
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]);
    };

    const getTotalTrend = async (startDate: Date) => {
      return await ExpenseModel.aggregate([
        { $match: { userId, date: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: { date: "$date", timezone: userTz } },
              month: { $month: { date: "$date", timezone: userTz } },
              day: { $dayOfMonth: { date: "$date", timezone: userTz } },
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]);
    };

    const totalDailyTrendWeek = await getTotalTrend(sevenDaysAgo);
    const totalDailyTrendMonth = await getTotalTrend(thirtyDaysAgo);
    const totalDailyTrendYear = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: yearStart, $lt: nextYear },
        },
      },
      {
        $group: {
          _id: { week: { $week: { date: "$date", timezone: userTz } }, year: { $year: { date: "$date", timezone: userTz } } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    const getDayPattern = async (startDate: Date) => {
      return await ExpenseModel.aggregate([
        { $match: { userId, date: { $gte: startDate }, subscriptionId: null } },
        {
          $group: {
            _id: { $dayOfWeek: { date: "$date", timezone: userTz } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    };

    const getVelocity = async (startDate: Date, days: number) => {
      const expenses = await ExpenseModel.find({
        userId,
        date: { $gte: startDate, $lt: tomorrow },
        type: "incidental",
        subscriptionId: null
      }).sort({ date: 1 }).lean();

      const budgetPerDay = (user.monthlyIncidentalBudget || 1000) / 30;
      let cumulative = 0;
      
      // Group by day offset
      const dailyMap: Record<number, number> = {};
      expenses.forEach(ex => {
        const d = new Date(ex.date);
        const dayDiff = Math.floor((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 0 && dayDiff < days) {
          dailyMap[dayDiff] = (dailyMap[dayDiff] || 0) + ex.amount;
        }
      });

      return Array.from({ length: days }, (_, i) => {
        cumulative += dailyMap[i] || 0;
        return {
          day: i + 1,
          actual: cumulative,
          ideal: budgetPerDay * (i + 1)
        };
      });
    };

    const [
      dailyTrendWeek, dailyTrendMonth,
      dayPatternWeek, dayPatternMonth, dayPatternYear,
      velocityWeek, velocityMonth, velocityYear
    ] = await Promise.all([
      getDailyTrend(sevenDaysAgo),
      getDailyTrend(thirtyDaysAgo),
      getDayPattern(sevenDaysAgo),
      getDayPattern(thirtyDaysAgo),
      getDayPattern(oneYearAgo), // Corrected to use oneYearAgo
      getVelocity(sevenDaysAgo, 7),
      getVelocity(thirtyDaysAgo, 30),
      getVelocity(oneYearAgo, 365),
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
            day: { $dayOfMonth: { date: "$date", timezone: userTz } },
            month: { $month: { date: "$date", timezone: userTz } },
            year: { $year: { date: "$date", timezone: userTz } },
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
          _id: { year: { $year: { date: "$date", timezone: userTz } }, month: { $month: { date: "$date", timezone: userTz } } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);


    // Weekly trend (last 7 days - date wise)
    const weeklyTrend = await ExpenseModel.aggregate([
      {
        $match: { userId, date: { $gte: sevenDaysAgo }, subscriptionId: null },
      },
      {
        $group: {
          _id: {
            year: { $year: { date: "$date", timezone: userTz } },
            month: { $month: { date: "$date", timezone: userTz } },
            day: { $dayOfMonth: { date: "$date", timezone: userTz } },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Yearly trend (last 52 weeks - week wise) - EXCLUDING subscriptions
    const yearlyWeeklyTrend = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: oneYearAgo },
          subscriptionId: null,
        },
      },
      {
        $group: {
          _id: { year: { $year: { date: "$date", timezone: userTz } }, week: { $week: { date: "$date", timezone: userTz } } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    // Monthly Incidental Trend (last 5 years)
    const monthlyIncidentalTrend = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: fiveYearsAgo },
          type: "incidental",
          subscriptionId: null,
        },
      },
      {
        $group: {
          _id: { year: { $year: { date: "$date", timezone: userTz } }, month: { $month: { date: "$date", timezone: userTz } } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
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

    // 2. Budget Streak Calculation
    const allDailyExpenses = await ExpenseModel.aggregate([
      { $match: { userId, type: "daily", subscriptionId: null, date: { $lt: tomorrow } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: userTz } }, total: { $sum: "$amount" } } },
      { $sort: { _id: -1 } }
    ]);

    let currentStreak = 0;
    const todayStr = today.toISOString().split('T')[0];
    
    // Check if yesterday or today was within budget to continue/start streak
    for (let i = 0; i < allDailyExpenses.length; i++) {
      const dayData = allDailyExpenses[i];
      if (dayData.total <= userDailyBudget) {
        currentStreak++;
      } else {
        // Break streak only if it's not today (today might not be over yet)
        if (dayData._id !== todayStr) break;
      }
    }

    // Update max streak if current is higher
    if (currentStreak > (user.maxStreak || 0)) {
      await UserModel.updateOne({ _id: userId }, { maxStreak: currentStreak });
    }

    return NextResponse.json({
      expenses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: {
        daily: dailyAgg[0]?.total || 0,
        dailyIncidental: dailyIncidentalAgg[0]?.total || 0,
        monthly: monthlyAgg[0]?.total || 0,
        monthlyIncidental: monthlyIncidentalAgg[0]?.total || 0,
        yearly: yearlyAgg[0]?.total || 0,
        allTime: allTimeAgg[0]?.total || 0,
        totalMonth: totalMonthAgg[0]?.total || 0,
        totalSixMonth: totalSixMonthAgg[0]?.total || 0,
        totalYear: totalYearAgg[0]?.total || 0,
        subscriptionTotal: subscriptionsAgg[0]?.total || 0,
        streak: currentStreak,
        maxStreak: Math.max(currentStreak, user.maxStreak || 0),
        monthlyIncidentalBudget: user.monthlyIncidentalBudget || 1000,
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
          const currentMonthParts = getParts(now);
          const year = parseInt(currentMonthParts.year || "0");
          const month = parseInt(currentMonthParts.month || "0") - 1; // 0-indexed
          const day = parseInt(currentMonthParts.day || "0"); // 1-indexed

          const totalDays = new Date(year, month + 1, 0).getDate();
          const spent = monthlyAgg[0]?.total || 0;
          const currentDay = day; 
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
        dailyTrend: {
          week: dailyTrendWeek,
          month: dailyTrendMonth,
          year: yearlyWeeklyTrend, // For year view, we use weekly breakdown to remain efficient
        },
        monthlyTrend, // Still 12 months as usual
        weeklyPattern: {
          week: dayPatternWeek,
          month: dayPatternMonth,
          year: dayPatternYear,
        },
        velocityData: {
          week: velocityWeek,
          month: velocityMonth,
          year: velocityYear,
        },
        totalSpendingTrend: {
          week: totalDailyTrendWeek,
          month: totalDailyTrendMonth,
          year: totalDailyTrendYear,
        },
        monthlyIncidentalTrend,
        essentialsRatio: await (async () => {
          const ratioSevenDaysAgo = new Date(today);
          ratioSevenDaysAgo.setDate(today.getDate() - 7);
          
          const getRatioAgg = async (start: Date, end: Date) => {
            return ExpenseModel.aggregate([
              { $match: { userId, date: { $gte: start, $lt: end }, subscriptionId: null } },
              { $group: { _id: "$type", total: { $sum: "$amount" } } }
            ]);
          };

          const [rw, rm, ry] = await Promise.all([
            getRatioAgg(sevenDaysAgo, tomorrow),
            getRatioAgg(monthStart, nextMonth),
            getRatioAgg(yearStart, nextYear)
          ]);

          const fmtR = (agg: any[]) => [
            { name: "Survival", value: agg.find(a => a._id === "daily")?.total || 0, color: "var(--accent)" },
            { name: "Lifestyle", value: agg.find(a => a._id === "incidental")?.total || 0, color: "#f72585" },
          ];

          return {
            week: fmtR(rw),
            month: fmtR(rm),
            year: fmtR(ry)
          };
        })(),
        incidentalDayPattern: await ExpenseModel.aggregate([
          { $match: { userId, type: "incidental", date: { $gte: thirtyDaysAgo } } },
          { $group: { _id: { $dayOfWeek: { date: "$date", timezone: userTz } }, total: { $sum: "$amount" } } },
          { $sort: { _id: 1 } }
        ])
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

    const userTz = req.headers.get("x-timezone") || "UTC";
    const body = await req.json();
    const { amount, category, description, date, location, type, subscriptionId } = body;

    // Helper to get offset for the input date
    const getOffset = (tz: string) => {
      const s = new Date().toLocaleString('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
      const m = s.match(/GMT([+-]\d+):?(\d+)?/);
      if (!m) return "+00:00";
      const sign = m[1].startsWith('-') ? '-' : '+';
      const hours = m[1].replace(/[+-]/, '').padStart(2, '0');
      const mins = (m[2] || "00").padStart(2, '0');
      return `${sign}${hours}:${mins}`;
    };
    const offset = getOffset(userTz);

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
      type: type || "daily",
      date: date ? new Date(`${date}T00:00:00${offset}`) : new Date(),
      location,
      subscriptionId: subscriptionId || undefined,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error("Expense creation error:", error);
    return NextResponse.json(
      { error: "Failed to create expense", details: error.message },
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
