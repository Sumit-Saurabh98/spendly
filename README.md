# 💸 Spendly — Daily Expense Tracker

A full-stack Next.js expense tracker with MongoDB backend, real-time budget tracking, and interactive charts.

## Tech Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **MongoDB + Mongoose**
- **Recharts** (interactive charts)
- **Lucide React** (icons)

---

## Features

- ✅ Set a **daily budget** → auto-calculates monthly (×31) and yearly (×31×12)
- ✅ **Real-time remaining amounts** for day / month / year
- ✅ **Progress bars** that turn yellow at 80% and red at 100%
- ✅ **Alerts** when budget limits are exceeded
- ✅ **Add expenses** with category, description, date
- ✅ **Live preview** of post-expense daily total before submitting
- ✅ **Interactive charts**: daily trend, monthly trend, category pie + bar
- ✅ **Expense logs** filterable by today / this month / this year / all time
- ✅ **Delete** individual expenses
- ✅ **All-time** data stored in MongoDB (lifetime tracking)
- ✅ No login / no auth — just open and use

---

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Set up MongoDB

**Option A – Local MongoDB:**
```bash
# Make sure MongoDB is running locally
# Default URI: mongodb://localhost:27017/expense-tracker
```

**Option B – MongoDB Atlas (cloud, free tier):**
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get your connection string

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017/expense-tracker
# or for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/expense-tracker
```

### 4. Run the development server

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
│   │   ├── expenses/route.ts   # GET, POST, DELETE expenses
│   │   └── budget/route.ts     # GET, POST budget
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── Dashboard.tsx           # Main UI (all tabs)
├── lib/
│   └── mongodb.ts              # DB connection
├── models/
│   ├── Expense.ts              # Expense schema
│   └── Budget.ts               # Budget schema
├── types/
│   └── index.ts                # TypeScript types
└── .env.local.example
```

---

## Tabs

| Tab | Description |
|-----|-------------|
| **Overview** | Budget cards, progress bars, 30-day mini chart |
| **Add Expense** | Form with live budget preview |
| **Analytics** | Category pie, bar chart, daily/monthly trends |
| **Logs** | Full expense history with filters and delete |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/expenses` | Get expenses + summary + chart data |
| POST | `/api/expenses` | Add new expense |
| DELETE | `/api/expenses?id=xxx` | Delete expense |
| GET | `/api/budget` | Get current budget |
| POST | `/api/budget` | Update daily budget |

### Query params for GET `/api/expenses`:
- `period`: `day` | `month` | `year` | (omit for all)
- `page`: page number (default 1)
- `limit`: items per page (default 50)
