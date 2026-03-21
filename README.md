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

- ✅ **Smart AI Assistant**: GPT-4o powered specialized insights with full context of your 6-month & 1-year spending habits.
- ✅ **Dynamic Budgeting**: Multi-tier limits (Daily, Monthly, Yearly) with breach alerts.
- ✅ **Subscription Management**: Deterministic, timezone-aware billing cycles with detailed payment history and "Upcoming Payment" notifications.
- ✅ **Expense Tracking**: Unified "Add Expense" modal with auto-fill for subscriptions and optional location logging.
- ✅ **Multi-Currency & Locale**: Dynamic currency symbols, country-based formatting, and locale-aware dates.
- ✅ **Interactive Analytics**: Filterable charts (7 Days, 1 Month, 1 Year) for categories, trends, and spending velocity.
- ✅ **Savings Goals**: Track milestones towards specific financial targets with visual progress.
- ✅ **Profile Management**: Centralized dashboard for currency, country, and budget settings.
- ✅ **Smart Alerts**: Visual warnings and email notifications (Nodemailer) for budget breaches.

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

```text
expense-tracker/
├── app/
│   ├── api/
│   │   ├── expenses/      # Aggregated spending data & logs
│   │   ├── subscriptions/ # Deterministic billing & history
│   │   ├── user/          # Profile & currency persistence
│   │   ├── budget/        # Multi-tier budget limits
│   │   └── chat/          # Context-aware AI Assistant
├── components/
│   ├── Dashboard.tsx      # Central application hub
│   ├── AddExpenseModal.tsx # Unified transaction entry
│   └── AIChat.tsx         # Responsive AI interface
├── models/                # Mongoose (Expense, Subscription, User, Goal)
├── lib/                   # Shared logic (MongoDB, Mail, Cron)
└── types/                 # Shared TypeScript interfaces
```

---

## API Documentation

### Core Endpoints

- **GET/POST** `/api/expenses`: Multi-period summaries, logs, and chart datasets.
- **GET/POST/PATCH** `/api/subscriptions`: Deterministic billing, history, and status toggling.
- **GET/POST** `/api/user`: Persistence for currency, country, and profile settings.
- **GET/POST/PATCH** `/api/goals`: Savings target tracking and status management.
- **GET/POST** `/api/budget`: Configuration for survival vs. incidental limits.
- **POST** `/api/chat`: AI Assistant with spending context tools.

---

## License

MIT
