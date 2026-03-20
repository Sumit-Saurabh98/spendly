import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendBreachEmail(amount: number, monthBudget: number, description: string) {
  const mailOptions = {
    from: `${process.env.GMAIL_USER}`,
    to: "sumitsaurabh112@gmail.com",
    subject: "⚠️ Budget Breach Alert - Expense Tracker",
    html: `
      <div style="font-family: sans-serif; padding: 24px; color: #1a1a1a; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
           <span style="font-size: 40px;">⚠️</span>
           <h2 style="color: #ff5370; margin-top: 10px; font-size: 24px;">Flash Alert: Budget Breach!</h2>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
          Hello, a single transaction has just exceeded <strong>20% of your total monthly budget</strong>.
        </p>

        <div style="background-color: #f7fafc; padding: 20px; border-radius: 12px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #718096; font-size: 14px;">Expense Amount</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #1a1a1a; font-size: 18px;">₹${amount.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096; font-size: 14px;">Description</td>
              <td style="padding: 8px 0; text-align: right; color: #2d3748;">${description}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096; font-size: 14px;">Monthly Budget</td>
              <td style="padding: 8px 0; text-align: right; color: #2d3748;">₹${monthBudget.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096; font-size: 14px;">Breach Threshold (20%)</td>
              <td style="padding: 8px 0; text-align: right; color: #ff5370; font-weight: 600;">₹${(monthBudget * 0.2).toLocaleString('en-IN')}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #718096; line-height: 1.5;">
          If this was intentional, no action is needed. If you're trying to save more, we suggest reviewing your upcoming expenses for the remainder of the month.
        </p>
        
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #edf2f7; text-align: center; font-size: 12px; color: #a0aec0;">
          This is an automated notification from your personal Expense Tracker.
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
