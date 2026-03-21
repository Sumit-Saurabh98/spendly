# 💸 Spendly — Smart Financial Tracker

A full-stack Next.js financial management system with MongoDB, real-time tracking, AI-powered insights, and interactive analytics.

## Tech Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **MongoDB + Mongoose**
- **OpenAI GPT-4o** (AI Assistant)
- **Recharts** (Interactive Analytics)
- **Lucide React** (Icons)

---

## Features

- ✅ **Secret Key Access**: Simple, secure access via a system-wide secret key.
- ✅ **AI Assistant**: Specialized GPT-4o assistant for financial insights and queries.
- ✅ **Dynamic Budgeting**: Set daily budgets with auto-calculated monthly and yearly limits.
- ✅ **Expense Tracking**: Log spends with categories, descriptions, and optional location data.
- ✅ **Recurring Payments**: Manage and auto-detect subscriptions.
- ✅ **Savings Goals**: Track progress towards specific financial targets.
- ✅ **Interactive Charts**: Comprehensive spending trends (Daily, Weekly, Monthly, Yearly).
- ✅ **Smart Alerts**: Visual warnings for daily, monthly, and yearly budget breaches.
- ✅ **Email Notifications**: Breach alerts sent via Nodemailer/Gmail.
- ✅ **Geographic Insights**: Map-based visualization of your spending locations.

---

## Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
GMAIL_USER=your_gmail_for_notifications
GMAIL_APP_PASSWORD=your_gmail_app_password
```

### 3. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
expense-tracker/
├── app/
│   ├── api/
│   │   ├── expenses/route.ts      # Main expense data & summaries
│   │   ├── chat/route.ts          # AI Assistant logic
│   │   ├── goals/route.ts         # Savings goals management
│   │   ├── subscriptions/route.ts # Recurring payments
│   │   ├── budget/route.ts        # Global budget settings
│   │   └── auth/verify/route.ts   # Secret key verification
├── components/
│   ├── Dashboard.tsx              # Main Application UI
│   └── AIChat.tsx                 # AI Assistant Interface
├── lib/
│   ├── mongodb.ts                 # Database connection
│   ├── cron.ts                    # Daily reminder service
│   └── mail.ts                    # Email notification service
├── models/                        # Mongoose Schemas
└── types/                         # TypeScript Definitions
```

---

## API Documentation

### Main Endpoints
- **GET** `/api/expenses`: Fetches all logs, summaries, and chart data.
- **POST** `/api/expenses`: Add a new transaction.
- **GET/POST** `/api/chat`: AI Assistant interaction and history.
- **GET/POST/PATCH** `/api/goals`: Manage savings targets.
- **GET/POST** `/api/subscriptions`: Manage recurring payments.
- **GET/POST** `/api/budget`: Manage system-wide budget limits.
- **POST** `/api/auth/verify`: Verify access with secret key.

---

## License
MIT
