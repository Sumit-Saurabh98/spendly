import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ExpenseModel } from "@/models/Expense";
import { SubscriptionModel } from "@/models/Subscription";
import { GoalModel } from "@/models/Goal";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

import { ChatMessageModel } from "@/models/ChatMessage";
import { UserModel } from "@/models/User";

export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const messages = await ChatMessageModel.find({ userId }).sort({ timestamp: 1 }).limit(100);
    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messages, currency, currencySymbol, clientDate } = await req.json();
    const userCurr = currency || "INR";
    const userSymbol = currencySymbol || "₹";

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key not configured. Please add it to your .env file." },
        { status: 500 }
      );
    }

    await connectDB();

    // Save the new user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "user") {
      await ChatMessageModel.create({ userId, role: "user", content: lastMessage.content });
    }

    // Use client date if provided, fallback to server time in IST
    const now = clientDate ? new Date(clientDate) : new Date();
    const nowIST = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    }).format(now);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful and intelligent Spendly Expense Tracker Assistant. 
          Current Local Time: ${nowIST}.
          User Preferred Currency: ${userCurr} (${userSymbol}).
          Your goal is strictly to help users manage their finances and answer questions ONLY about their profile, expenses, savings goals, and subscriptions.
          
          CAPABILITIES:
          1. You have access to the user's Expenses, Savings Goals, and Recurring Subscriptions.
          2. Expenses often include Location data. Use this to answer geographic questions like "Where do I spend the most?".
          3. You can see the progress of various Savings Goals.
          
          CRITICAL RULES:
          1. ONLY answer questions related to the user's financial profile, expenses, budget, goals, or subscriptions.
          2. IF A USER ASKS ABOUT ANYTHING ELSE (e.g., general knowledge, coding, science, history), YOU MUST REFUSE professionally.
          3. Generic Refusal: "I am here to help you about your profile and financial data. I cannot answer questions on other topics."
          4. ALWAYS use the user's preferred currency: ${userCurr} (${userSymbol}) for ALL values.
          7. IMPORTANT: Only report expenses that are explicitly found in the "Expenses" history. 
          8. Subscriptions show *future* recurring costs; DO NOT report them as completed payments for today unless they appear in the expense logs.
          9. If you see an expense in the history with a FUTURE date (relative to ${nowIST}), acknowledge it as a future-dated entry, NOT as evidence that today is that date.
          10. Group transaction logs by Bold Dates, using relative terms if helpful (e.g., "Today, March 24, 2026"):
             - **Date:**
               - Item Description (Type - Category) - ${userSymbol}Amount`,
        },
        ...messages,
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "get_financial_summary",
            description: "Get the overall financial summary (daily, monthly, yearly totals and budget)",
            parameters: { type: "object", properties: {} },
          },
        },
        {
          type: "function",
          function: {
            name: "search_expenses",
            description: "Search for specific expenses by category, description, or location (area name)",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search keyword for description, category, or area name" },
                limit: { type: "number", description: "Number of results to return (default 10)" },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "get_subscriptions",
            description: "Get all active and detected recurring subscriptions/payments",
            parameters: { type: "object", properties: {} },
          },
        },
        {
          type: "function",
          function: {
            name: "get_goals",
            description: "Get all savings goals and their current progress",
            parameters: { type: "object", properties: {} },
          },
        },
        {
          type: "function",
          function: {
            name: "get_expense_logs",
            description: "Get detailed expense logs for a specific number of days",
            parameters: {
              type: "object",
              properties: {
                days: { type: "number", description: "Number of days back to look for expenses (e.g., 7 for last week)" },
                limit: { type: "number", description: "Maximum number of logs to return (default 20)" },
              },
              required: ["days"],
            },
          },
        },
      ],
      max_tokens: 300,
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
      const toolCalls = message.tool_calls;
      const updatedMessages = [...messages, message];

      for (const toolCall of toolCalls) {
        let result = "";
        const tc = toolCall as any;
        if (tc.function.name === "get_financial_summary") {
          // Use the 'now' from outer scope which is synchronized with client
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "numeric",
            day: "numeric",
          });
          const parts = formatter.formatToParts(now);
          const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0");
          
          const year = getPart("year");
          const month = getPart("month");
          const day = getPart("day");

          const today = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`);
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          const monthStart = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:30`);
          const yearStart = new Date(`${year}-01-01T00:00:00+05:30`);
          const sixMonthsAgo = new Date(today);
          sixMonthsAgo.setMonth(today.getMonth() - 6);

          const [user, dailyTotal, monthlyTotal, sixMonthTotal, yearlyTotal, subs] = await Promise.all([
            UserModel.findById(userId),
            ExpenseModel.aggregate([{ $match: { userId, date: { $gte: today, $lt: tomorrow } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            ExpenseModel.aggregate([{ $match: { userId, date: { $gte: monthStart, $lt: tomorrow } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            ExpenseModel.aggregate([{ $match: { userId, date: { $gte: sixMonthsAgo, $lt: tomorrow } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            ExpenseModel.aggregate([{ $match: { userId, date: { $gte: yearStart, $lt: tomorrow } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            SubscriptionModel.find({ userId, isActive: true })
          ]);

          const subTotal = subs.reduce((sum: number, s: any) => sum + s.amount, 0);

          result = JSON.stringify({
            budget: user?.dailyBudget || 100,
            daily: dailyTotal[0]?.total || 0,
            monthly: monthlyTotal[0]?.total || 0,
            sixMonthTotal: sixMonthTotal[0]?.total || 0,
            yearly: yearlyTotal[0]?.total || 0,
            subscriptionTotal: subTotal,
            currency: `${userCurr} (${userSymbol})`,
            note: "These totals include daily expenses, incidental spends, and recurring subscriptions."
          });
        } else if (tc.function.name === "search_expenses") {
          const args = JSON.parse(tc.function.arguments);
          const query = { 
            userId,
            ...(args.query ? { 
              $or: [
                { category: { $regex: args.query, $options: "i" } },
                { description: { $regex: args.query, $options: "i" } },
                { "location.name": { $regex: args.query, $options: "i" } }
              ]
            } : {})
          };
          
          const expenses = await ExpenseModel.find(query).sort({ date: -1 }).limit(args.limit || 10).lean();
          result = JSON.stringify(expenses);
        } else if (tc.function.name === "get_subscriptions") {
          const subs = await SubscriptionModel.find({ userId }).lean();
          result = JSON.stringify(subs);
        } else if (tc.function.name === "get_goals") {
          const goals = await GoalModel.find({ userId }).lean();
          result = JSON.stringify(goals);
        } else if (tc.function.name === "get_expense_logs") {
          const args = JSON.parse(tc.function.arguments);
          const startDate = new Date(now);
          startDate.setDate(startDate.getDate() - (args.days || 30));
          
          const logs = await ExpenseModel.find({
            userId,
            date: { $gte: startDate }
          })
          .sort({ date: -1 })
          .limit(args.limit || 20)
          .lean();
          
          result = JSON.stringify(logs.map(l => ({
            date: new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }).format(new Date(l.date)),
            amount: l.amount,
            category: l.category,
            description: l.description,
            type: l.type,
            isFuture: new Date(l.date) > now
          })));
        }

        updatedMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      const secondaryResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a Spendly AI assistant. Analyze the tool results and answer the user question based on them. ONLY answer questions related to the user's financial profile and data. For all other topics, provide a generic refusal. ALWAYS use ${userCurr} (${userSymbol}).
            When presenting expense logs, Group by Bold Dates and use a nested list:
            - **Month Day, Year:**
              - Description (Type - Category) - ${userSymbol}Amount`,
          },
          ...updatedMessages
        ],
        max_tokens: 400,
      });

      const aiContent = secondaryResponse.choices[0].message.content || "";
      await ChatMessageModel.create({ userId, role: "assistant", content: aiContent });
      return NextResponse.json({ message: aiContent });
    }

    const aiContent = message.content || "";
    await ChatMessageModel.create({ userId, role: "assistant", content: aiContent });
    return NextResponse.json({ message: aiContent });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
