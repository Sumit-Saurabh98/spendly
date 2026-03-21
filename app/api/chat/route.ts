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

    const { messages, currency, currencySymbol } = await req.json();
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

    // Get current time in IST
    const nowIST = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    }).format(new Date());

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
          5. Be concise and maintain a small token footprint.`,
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
          const now = new Date();
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
          const monthStart = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:30`);
          const yearStart = new Date(`${year}-01-01T00:00:00+05:30`);

          const [user, daily, monthly, yearly, subs] = await Promise.all([
            UserModel.findById(userId),
            ExpenseModel.aggregate([{ $match: { userId, date: { $gte: today }, subscriptionId: null } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            ExpenseModel.aggregate([{ $match: { userId, date: { $gte: monthStart }, subscriptionId: null } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            ExpenseModel.aggregate([{ $match: { userId, date: { $gte: yearStart }, subscriptionId: null } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            SubscriptionModel.find({ userId, isActive: true })
          ]);

          const subTotal = subs.reduce((sum: number, s: any) => sum + s.amount, 0);

          result = JSON.stringify({
            budget: user?.dailyBudget || 100,
            daily: daily[0]?.total || 0,
            monthly: monthly[0]?.total || 0,
            yearly: yearly[0]?.total || 0,
            subscriptionTotal: subTotal,
            currency: `${userCurr} (${userSymbol})`
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
            content: `You are a Spendly AI assistant. Analyze the tool results and answer the user question based on them. ONLY answer questions related to the user's financial profile and data. For all other topics, provide a generic refusal. ALWAYS use ${userCurr} (${userSymbol}).`,
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
