import cron from "node-cron";
import { connectDB } from "./mongodb";
import { ExpenseModel } from "@/models/Expense";
import { UserModel } from "@/models/User";
import nodemailer from "nodemailer";

export function initCron() {
  console.log("📅 Cron Service Initialized (Asia/Kolkata)");

  // Run every day at 9:00 PM (21:00) Asia/Kolkata
  cron.schedule("0 21 * * *", async () => {
    try {
      console.log("🕒 Running 9 PM Reminder Check...");
      await connectDB();
      
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", { 
        timeZone: "Asia/Kolkata", 
        year: "numeric", 
        month: "numeric", 
        day: "numeric" 
      });
      const parts = formatter.formatToParts(now);
      const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0");
      
      const year = getPart("year");
      const month = getPart("month");
      const day = getPart("day");

      // Start of TODAY in IST
      const today = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`);
      
      const users = await UserModel.find({});
      
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      for (const user of users) {
        const dailyExpenses = await ExpenseModel.find({
          userId: user._id.toString(),
          date: { $gte: today }
        });

        if (dailyExpenses.length === 0) {
          console.log(`📝 No expenses found for user ${user.email}. Sending reminder...`);
          
          await transporter.sendMail({
            from: `"Spendly" <${process.env.GMAIL_USER}>`,
            to: user.email,
            subject: "🕒 Daily Reminder: Log your expenses!",
            html: `
              <div style="font-family: sans-serif; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px; max-width: 500px; margin: auto; background-color: #ffffff; color: #1a1a1a;">
                <div style="font-size: 50px; text-align: center; margin-bottom: 20px;">✍️</div>
                <h2 style="color: #7c5cfc; text-align: center; margin-bottom: 16px; font-size: 24px;">Don't forget to log!</h2>
                <p style="font-size: 16px; color: #4a5568; line-height: 1.6; text-align: center;">
                  It's 9:00 PM and you haven't recorded any expenses for today. 
                </p>
                <p style="font-size: 15px; color: #718096; text-align: center; margin-bottom: 30px;">
                  Consistency is the secret to financial discipline. Take 30 seconds to log your spends now!
                </p>
                <div style="text-align: center;">
                  <a href="https://spendly-tracker.vercel.app" style="background: #7c5cfc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(124, 92, 252, 0.3);">
                    Open Tracker
                  </a>
                </div>
                <p style="font-size: 12px; color: #a0aec0; margin-top: 40px; border-top: 1px solid #edf2f7; pt: 20px; text-align: center;">
                  This is a friendly automated reminder from your Spendly Tracker.
                </p>
              </div>
            `
          });
        }
      }
      console.log("✅ Cron Reminder Cycle Completed Successfully.");
    } catch (err) {
      console.error("❌ Cron Execution Error:", err);
    }
  }, {
    timezone: "Asia/Kolkata"
  });
}
