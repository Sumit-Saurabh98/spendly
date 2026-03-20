import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ExpenseModel } from "@/models/Expense";
import { BudgetModel } from "@/models/Budget";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

import { ChatMessageModel } from "@/models/ChatMessage";

export async function GET() {
  try {
    await connectDB();
    const messages = await ChatMessageModel.find().sort({ timestamp: 1 }).limit(100);
    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

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
      await ChatMessageModel.create({ role: "user", content: lastMessage.content });
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
          content: `You are a helpful and intelligent Expense Tracker Assistant. 
          Current Local Time (IST): ${nowIST}.
          Your goal is to help users manage their finances.
          
          CRITICAL RULES:
          1. ALWAYS use Indian Rupees (₹) for ALL currency values. NEVER use dollars ($) or other currencies.
          2. Use tools to query the database for accurate, real-time information.
          3. If the user asks about "today", "this month", etc., use the tools to find data relative to ${nowIST}.
          4. Be concise, professional, and insightful.`,
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
            description: "Search for specific expenses by category or description",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search keyword for description or category" },
                limit: { type: "number", description: "Number of results to return (default 10)" },
              },
            },
          },
        },
      ],
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

          const [budget, daily, monthly, yearly] = await Promise.all([
            BudgetModel.findOne(),
            ExpenseModel.aggregate([{ $match: { date: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            ExpenseModel.aggregate([{ $match: { date: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            ExpenseModel.aggregate([{ $match: { date: { $gte: yearStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
          ]);

          result = JSON.stringify({
            budget: budget?.dailyBudget || 100,
            daily: daily[0]?.total || 0,
            monthly: monthly[0]?.total || 0,
            yearly: yearly[0]?.total || 0,
            currency: "INR (₹)"
          });
        } else if (tc.function.name === "search_expenses") {
          const args = JSON.parse(tc.function.arguments);
          const query = args.query ? { 
            $or: [
              { category: { $regex: args.query, $options: "i" } },
              { description: { $regex: args.query, $options: "i" } }
            ]
          } : {};
          
          const expenses = await ExpenseModel.find(query).sort({ date: -1 }).limit(args.limit || 10).lean();
          result = JSON.stringify(expenses);
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
            content: "You are an AI assistant. Analyze the tool results and answer the user question based on them. ALWAYS use ₹ and INR.",
          },
          ...updatedMessages
        ],
      });

      const aiContent = secondaryResponse.choices[0].message.content || "";
      await ChatMessageModel.create({ role: "assistant", content: aiContent });
      return NextResponse.json({ message: aiContent });
    }

    const aiContent = message.content || "";
    await ChatMessageModel.create({ role: "assistant", content: aiContent });
    return NextResponse.json({ message: aiContent });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
