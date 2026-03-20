import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spendly — Daily Expense Tracker",
  description: "Track your daily, monthly, and yearly expenses in real-time",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
