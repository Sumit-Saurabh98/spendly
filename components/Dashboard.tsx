"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, PlusCircle, BarChart3, List, AlertTriangle,
  TrendingUp, TrendingDown, Wallet, CalendarDays,
 Trash2, RefreshCw, Settings, IndianRupee, Sparkles,
  Lock, Key, Map, Locate, X, Mail,
  LogOutIcon, User
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { CATEGORIES } from "@/types";
import AIChat from "./AIChat";

const COLORS = ["#7c5cfc", "#22d3a0", "#ff5370", "#ffd166", "#4da6ff", "#ff8c42", "#b983ff", "#00b4d8", "#f72585", "#90e0ef"];

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
];

const MapView = ({ expenses, currencySymbol }: { expenses: Expense[], currencySymbol: string }) => {
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).L) return;

    const L = (window as any).L;
    const mapData = expenses.filter(ex => ex.location?.latitude && ex.location?.longitude);
    
    // Default center
    const defaultCenter: [number, number] = [20.5937, 78.9629];
    const map = L.map("spending-map").setView(defaultCenter, 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markers: any[] = [];
    mapData.forEach((ex) => {
      const marker = L.marker([ex.location!.latitude, ex.location!.longitude])
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; padding: 4px; min-width: 120px;">
            <b style="color: #7c5cfc; font-size: 13px; text-transform: uppercase;">${ex.category}</b>
            <div style="font-weight: 800; font-size: 18px; margin: 4px 0;">${currencySymbol}${ex.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div style="color: #64748b; font-size: 12px; border-top: 1px solid #eee; padding-top: 4px; margin-top: 4px;">${ex.description}</div>
          </div>
        `);
      markers.push(marker);
    });

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      map.remove();
    };
  }, [expenses]);

  return <div id="spending-map" style={{ height: 500, borderRadius: 16, border: "1px solid var(--border)", zIndex: 1, background: "var(--bg3)" }} />;
};

const Modal = ({ isOpen, onClose, title, children, type = "default" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; type?: "default" | "danger" | "success" }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div 
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", cursor: "pointer" }} 
        onClick={onClose}
      />
      <div className="card animate-scale-in" style={{ 
        position: "relative", 
        width: "100%", 
        maxWidth: 400, 
        padding: 0, 
        overflow: "hidden", 
        border: type === "danger" ? "1px solid rgba(255, 83, 112, 0.3)" : "1px solid var(--border)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
      }}>
        <div style={{ 
          padding: "16px 20px", 
          borderBottom: "1px solid var(--border)", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          background: type === "danger" ? "rgba(255, 83, 112, 0.05)" : "rgba(124, 92, 252, 0.05)"
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: type === "danger" ? "var(--red)" : "var(--text)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", display: "flex", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

type Tab = "overview" | "add" | "charts" | "logs" | "map" | "subscriptions" | "goals" | "chat" | "profile";

interface Expense {
  _id: string;
  amount: number;
  category: string;
  description: string;
  type: "daily" | "incidental";
  date: string;
  location?: { latitude: number; longitude: number; name?: string };
  createdAt: string;
}

interface Subscription {
  _id: string;
  name: string;
  amount: number;
  category: string;
  frequency: string;
  nextBillingDate?: string;
  isActive: boolean;
  isAutoDetected: boolean;
}

interface Goal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  status: "active" | "completed" | "paused";
  color: string;
}

interface ChartData {
  categories: {
    week: { _id: string; total: number; count: number }[];
    month: { _id: string; total: number; count: number }[];
    year: { _id: string; total: number; count: number }[];
  };
  dailyTrend: { _id: { year: number; month: number; day: number }; total: number; count: number }[];
  monthlyTrend: { _id: { year: number; month: number }; total: number; count: number }[];
  weeklyTrend: { _id: { year: number; month: number; day: number }; total: number; count: number }[];
  yearlyWeeklyTrend: { _id: { year: number; week: number }; total: number; count: number }[];
  weekdayPattern: { _id: number; total: number; count: number }[];
  velocityData: { day: number; actual: number; ideal: number }[];
  essentialsRatio: {
    week: { name: string; value: number; color: string }[];
    month: { name: string; value: number; color: string }[];
    year: { name: string; value: number; color: string }[];
  };
  incidentalDayPattern: { _id: number; total: number; count: number }[];
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [tab, setTab] = useState<Tab>("overview");
  const [currency, setCurrency] = useState("INR");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [country, setCountry] = useState("IN");
  const [dailyBudget, setDailyBudget] = useState(100);
  const [newBudget, setNewBudget] = useState("");
  const [newIncidentalBudget, setNewIncidentalBudget] = useState("");
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [showIncidentalEdit, setShowIncidentalEdit] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState({ 
    daily: 0, dailyIncidental: 0, 
    monthly: 0, monthlyIncidental: 0, 
    yearly: 0, allTime: 0, 
    maxExpense: null as any, avgDaily: 0, 
    topCategoryWeek: null as any,
    streak: 0, maxStreak: 0,
    monthlyIncidentalBudget: 1000,
    comparison: { thisMonth: { total: 0, categories: [] }, lastMonth: { total: 0, categories: [] } },
    forecast: { projected: 0, totalDays: 30, currentDay: 1, daysRemaining: 29 },
    subscriptionTotal: 0
  });
  const [charts, setCharts] = useState<ChartData>({
    categories: { week: [], month: [], year: [] },
    dailyTrend: [], monthlyTrend: [], weeklyTrend: [], yearlyWeeklyTrend: [], weekdayPattern: [],
    velocityData: [], 
    essentialsRatio: { week: [], month: [], year: [] }, 
    incidentalDayPattern: []
  });
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [detectedSubscriptions, setDetectedSubscriptions] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [modal, setModal] = useState<{
    type: "add-funds" | "confirm-delete" | "flash-alert" | null;
    data: any;
  }>({ type: null, data: null });
  const [alerts, setAlerts] = useState<string[]>([]);
  const [showReminder, setShowReminder] = useState(false);
  const [logPeriod, setLogPeriod] = useState<"day" | "month" | "year" | "all">("month");
  const [trendPeriod, setTrendPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [ratioPeriod, setRatioPeriod] = useState<"week" | "month" | "year">("month");
  const [categoryPeriod, setCategoryPeriod] = useState<"week" | "month" | "year">("year");

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(n);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

  const getLocalISODate = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  const [form, setForm] = useState({
    amount: "",
    category: CATEGORIES[0],
    description: "",
    type: "daily" as "daily" | "incidental",
    date: getLocalISODate(),
    location: null as { latitude: number; longitude: number; name?: string } | null,
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const checkAuth = () => {
      const userId = localStorage.getItem("expense_user_id");
      if (userId) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };
    const checkReminder = () => {
      const hours = new Date().getHours();
      // Show reminder if after 9pm and no entries today
      if (hours >= 21 && (summary?.daily === 0) && isAuthenticated) {
        setShowReminder(true);
      } else {
        setShowReminder(false);
      }
    };
    checkAuth();
    checkReminder();
    const interval = setInterval(() => {
      checkAuth();
      checkReminder();
    }, 10000);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [summary?.daily, isAuthenticated]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsAuthenticating(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthStep("otp");
      } else {
        setAuthError(data.error || "Failed to send OTP");
      }
    } catch (err) {
      setAuthError("Server Error. Try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setIsAuthenticating(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("expense_user_id", data.user._id);
        localStorage.setItem("expense_user_email", data.user.email);
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || "Invalid OTP");
      }
    } catch (err) {
      setAuthError("Server Error. Try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("expense_user_id");
    localStorage.removeItem("expense_user_email");
    setIsAuthenticated(false);
    setAuthStep("email");
    setEmail("");
    setOtp("");
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setModal({ type: "flash-alert", data: { message: "Geolocation is not supported by your browser.", onConfirm: () => setModal({ type: null, data: null }) } });
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      let name = "";
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
          headers: { "User-Agent": "SpendlyTracker/1.0" }
        });
        const data = await res.json();
        name = data.address?.suburb || data.address?.neighbourhood || data.address?.road || data.address?.city || data.display_name.split(',')[0];
      } catch (err) {
        console.error("Geocoding failed", err);
      }
      setForm(prev => ({ ...prev, location: { latitude, longitude, name } }));
      setIsLocating(false);
    }, (err) => {
      setModal({ type: "flash-alert", data: { message: "Unable to retrieve your location. Please check your permissions.", onConfirm: () => setModal({ type: null, data: null }) } });
      setIsLocating(false);
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const userId = localStorage.getItem("expense_user_id");
    if (!userId) return;

    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const commonHeaders = { "x-user-id": userId, "x-timezone": userTz };
      
      const [budgetRes, expensesRes, subsRes, goalsRes, userRes] = await Promise.all([
        fetch("/api/budget", { headers: commonHeaders }),
        fetch(`/api/expenses?period=${logPeriod}&limit=100`, { headers: commonHeaders }),
        fetch("/api/subscriptions", { headers: commonHeaders }),
        fetch("/api/goals", { headers: commonHeaders }),
        fetch("/api/user", { headers: commonHeaders }),
      ]);
      const budgetData = await budgetRes.json();
      const expensesData = await expensesRes.json();
      const subsData = await subsRes.json();
      const goalsData = await goalsRes.json();
      const userData = await userRes.json();

      if (!userData.error) {
        setCurrency(userData.currency || "INR");
        setCurrencySymbol(userData.currencySymbol || "₹");
        setCountry(userData.country || "IN");
        
        // Auto-detect if new user or default values
        if (!userData.currency) {
          try {
            const detectedCurrency = Intl.NumberFormat().resolvedOptions().currency || "INR";
            const detectedSymbol = new Intl.NumberFormat(undefined, { style: 'currency', currency: detectedCurrency }).formatToParts(1).find(p => p.type === 'currency')?.value || "₹";
            setCurrency(detectedCurrency);
            setCurrencySymbol(detectedSymbol);
            
            // Save detected values
            fetch("/api/user", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...commonHeaders },
              body: JSON.stringify({ currency: detectedCurrency, currencySymbol: detectedSymbol })
            });
          } catch (err) { console.error("Auto-detect failed", err); }
        }
      }

      setDailyBudget(budgetData.dailyBudget || 100);
      setExpenses(expensesData.expenses || []);
      if (expensesData.summary) setSummary(expensesData.summary);
      if (expensesData.charts) setCharts(expensesData.charts);
      setSubscriptions(subsData.subscriptions || []);
      setDetectedSubscriptions(subsData.detected || []);
      setGoals(goalsData || []);

      // Alerts
      const daily = budgetData.dailyBudget || 100;
      const newAlerts: string[] = [];
      
      // Daily alerts (Mutually exclusive)
      if (expensesData.summary?.daily > daily) {
        newAlerts.push("⚠️ You've exceeded your daily budget!");
      } else if (expensesData.summary?.daily > daily * 0.8) {
        newAlerts.push("🟡 You've used 80%+ of today's budget.");
      }

      // Monthly/Yearly alerts
      if (expensesData.summary?.monthly > daily * 31) newAlerts.push("⚠️ You've exceeded your monthly budget!");
      if (expensesData.summary?.yearly > daily * 31 * 12) newAlerts.push("⚠️ You've exceeded your yearly budget!");
      setAlerts(newAlerts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [logPeriod]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description) return;

    const userId = localStorage.getItem("expense_user_id");
    if (!userId) return;

    // Budget Breach Alert (20% of monthly budget)
    const monthlyBudget = dailyBudget * 31;
    const amountNum = parseFloat(form.amount);

    const proceedSubmit = async () => {
      // Send Email Notification
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      fetch("/api/notify/breach", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId, "x-timezone": userTz },
        body: JSON.stringify({ amount: amountNum, monthBudget: monthlyBudget, description: form.description }),
      }).catch(err => console.error("Email notify failed", err));

      setSubmitting(true);
      try {
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": userId, "x-timezone": userTz },
          body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
        });
        if (res.ok) {
          setForm({ amount: "", category: CATEGORIES[0], description: "", type: "daily", date: getLocalISODate(), location: null });
          fetchData();
          setTab("overview");
        }
      } finally {
        setSubmitting(false);
      }
    };

    if (amountNum > monthlyBudget * 0.2) {
      setModal({
        type: "flash-alert",
        data: {
          message: `⚠️ Flash Alert: This expense (${currencySymbol}${amountNum}) is more than 20% of your total monthly budget (${currencySymbol}${monthlyBudget}). Proceed?`,
          onConfirm: () => {
            setModal({ type: null, data: null });
            proceedSubmit();
          }
        }
      });
      return;
    }

    proceedSubmit();
  };

  const handleDelete = async (id: string, type: "expense" | "goal" | "subscription" = "expense") => {
    setModal({
      type: "confirm-delete",
      data: {
        id,
        title: `Delete ${type.charAt(0).toUpperCase() + type.slice(1)}?`,
        message: `Are you sure you want to remove this ${type}? This action cannot be undone.`,
        onConfirm: async () => {
          const userId = localStorage.getItem("expense_user_id");
          if (!userId) return;
          const endpoints = { expense: "/api/expenses", goal: "/api/goals", subscription: "/api/subscriptions" };
          await fetch(`${endpoints[type]}?id=${id}`, { 
            method: "DELETE",
            headers: { "x-user-id": userId }
          });
          setModal({ type: null, data: null });
          fetchData();
        }
      }
    });
  };

  const handleBudgetSave = async () => {
    const val = parseFloat(newBudget);
    if (!val || val <= 0) return;
    const userId = localStorage.getItem("expense_user_id");
    if (!userId) return;

    await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({ dailyBudget: val }),
    });
    setShowBudgetEdit(false);
    setNewBudget("");
    fetchData();
  };

  const handleIncidentalBudgetSave = async () => {
    const val = parseFloat(newIncidentalBudget);
    if (!val || val <= 0) return;
    const userId = localStorage.getItem("expense_user_id");
    if (!userId) return;

    await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({ monthlyIncidentalBudget: val }),
    });
    setShowIncidentalEdit(false);
    setNewIncidentalBudget("");
    fetchData();
  };

  const monthly = dailyBudget * 31;
  const yearly = dailyBudget * 31 * 12;

  const dailyPct = Math.min((summary.daily / dailyBudget) * 100, 100);
  const monthlyPct = Math.min((summary.monthly / monthly) * 100, 100);
  const yearlyPct = Math.min((summary.yearly / yearly) * 100, 100);

  const progressColor = (pct: number) =>
    pct >= 100 ? "#ff5370" : pct >= 80 ? "#ffd166" : "#22d3a0";

  // Chart data formatting
  const trendData = (() => {
    if (trendPeriod === "weekly") {
      return (charts.weeklyTrend || []).map((d) => ({
        name: `${d._id.day} ${MONTH_NAMES[d._id.month - 1]}`,
        spent: d.total,
        budget: dailyBudget,
      }));
    } else if (trendPeriod === "yearly") {
      return (charts.yearlyWeeklyTrend || []).map((d) => ({
        name: `W${d._id.week}`,
        spent: d.total,
        budget: dailyBudget * 7,
      }));
    }
    return (charts.dailyTrend || []).map((d) => ({
      name: `${d._id.day} ${MONTH_NAMES[d._id.month - 1]}`,
      spent: d.total,
      budget: dailyBudget,
    }));
  })();

  const dailyTrendData = charts.dailyTrend.map((d) => ({
    name: `${d._id.day} ${MONTH_NAMES[d._id.month - 1]}`,
    spent: d.total,
    budget: dailyBudget,
  }));

  const monthlyTrendData = charts.monthlyTrend.map((d) => ({
    name: `${MONTH_NAMES[d._id.month - 1]} ${d._id.year}`,
    spent: d.total,
    budget: monthly,
  }));

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyTrendData = (charts.weekdayPattern || []).map((d) => ({
    name: WEEKDAYS[(d._id as any) - 1],
    spent: d.total,
  })).sort((a,b) => WEEKDAYS.indexOf(a.name) - WEEKDAYS.indexOf(b.name));

  const currentCategories = charts.categories[categoryPeriod] || [];
  const pieData = currentCategories.map((c, i) => ({
    name: c._id,
    value: c.total,
    color: COLORS[i % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
          <p style={{ color: "var(--text2)", marginBottom: 4, fontSize: 12 }}>{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600, margin: "2px 0" }}>
              {p.name}: {fmt(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="animate-slide-up" style={{ maxWidth: 400, width: "100%" }}>
          <div className="card" style={{ padding: 40, textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", border: "1px solid var(--border)" }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(124, 92, 252, 0.1)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              {authStep === "email" ? <Wallet size={32} /> : <Lock size={32} />}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", color: "var(--text)" }}>
              {authStep === "email" ? "Welcome to Spendly" : "Check your email"}
            </h1>
            <p style={{ fontSize: 14, color: "var(--text2)", margin: "0 0 32px" }}>
              {authStep === "email" 
                ? "Enter your email to sign in or create an account" 
                : `We've sent a 6-digit code to ${email}`}
            </p>
            
            <form onSubmit={authStep === "email" ? handleSendOTP : handleVerifyOTP}>
              <div style={{ position: "relative", marginBottom: 20 }}>
                {authStep === "email" ? (
                  <>
                    <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text2)" }}>
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoFocus
                      required
                      style={{ 
                        width: "100%", 
                        padding: "14px 14px 14px 44px", 
                        borderRadius: 12, 
                        background: "var(--bg3)", 
                        border: authError ? "1px solid var(--red)" : "1px solid var(--border)", 
                        color: "var(--text)",
                        fontSize: 15,
                        outline: "none",
                        transition: "all 0.2s"
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text2)" }}>
                      <Key size={18} />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      autoFocus
                      required
                      style={{ 
                        width: "100%", 
                        padding: "14px 14px 14px 44px", 
                        borderRadius: 12, 
                        background: "var(--bg3)", 
                        border: authError ? "1px solid var(--red)" : "1px solid var(--border)", 
                        color: "var(--text)",
                        fontSize: 24,
                        letterSpacing: "4px",
                        textAlign: "center",
                        fontWeight: 800,
                        outline: "none",
                        transition: "all 0.2s"
                      }}
                    />
                  </>
                )}
              </div>
              
              {authError && (
                <p style={{ color: "var(--red)", fontSize: 13, margin: "-12px 0 20px", fontWeight: 500 }}>{authError}</p>
              )}
              
              <button 
                type="submit" 
                disabled={isAuthenticating}
                className="btn-primary" 
                style={{ width: "100%", padding: 14, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {isAuthenticating ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                {isAuthenticating 
                  ? (authStep === "email" ? "Sending..." : "Verifying...") 
                  : (authStep === "email" ? "Get Started" : "Verify Code")}
              </button>

              {authStep === "otp" && (
                <button 
                  type="button"
                  onClick={() => setAuthStep("email")}
                  style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600, marginTop: 16, cursor: "pointer" }}
                >
                  Change Email
                </button>
              )}
            </form>
          </div>
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text2)", opacity: 0.5 }}>
            By signing in, you agree to our terms and privacy policy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "0 0 60px" }}>
      {/* Daily Reminder Banner */}
      {showReminder && (
        <div style={{ background: "linear-gradient(90deg, #7c5cfc, #b983ff)", color: "white", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, position: "relative" }}>
          <Sparkles size={18} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>It's 9:00 PM! Don't forget to log your expenses for today.</span>
          <button onClick={() => setShowReminder(false)} style={{ position: "absolute", right: 20, color: "white", opacity: 0.7, padding: 4 }}>
            <Trash2 size={16} /> 
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={20} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Spendly</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text2)" }}>Daily Expense Tracker</p>
              <span style={{ color: "var(--border2)", fontSize: 11 }}>•</span>
              <p style={{ margin: 0, fontSize: 11, color: "var(--accent2)", fontWeight: 500 }}>
                {currentTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} , {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={fetchData} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px", color: "var(--text2)", cursor: "pointer", display: "flex" }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ padding: "12px 24px 0" }}>
          {alerts.map((a, i) => (
            <div key={i} className="alert-banner" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", marginBottom: 8 }}>
              <AlertTriangle size={16} color="#ff5370" />
              <span style={{ color: "#ff5370", fontSize: 14, fontWeight: 500 }}>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding: "16px 24px 0", display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8 }}>
        {([
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "add", label: "Add Expense", icon: PlusCircle },
          { id: "charts", label: "Analytics", icon: BarChart3 },
          { id: "logs", label: "Logs", icon: List },
          { id: "subscriptions", label: "Recurring", icon: RefreshCw },
          { id: "goals", label: "Goals", icon: Wallet },
          { id: "chat", label: "AI Assistant", icon: Sparkles },
          { id: "map", label: "Map", icon: Map },
          { id: "profile", label: "Profile", icon: Settings },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={tab === id ? "tab-active" : "tab-inactive"}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s", whiteSpace: "nowrap" }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px" }}>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="animate-slide-up">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Daily Survival", spent: summary.daily, budget: dailyBudget, icon: CalendarDays, pct: dailyPct, remaining: dailyBudget - summary.daily, color: "var(--accent)" },
                { label: "Monthly Incidental", spent: summary.monthlyIncidental, budget: summary.monthlyIncidentalBudget, icon: Sparkles, pct: Math.min((summary.monthlyIncidental / summary.monthlyIncidentalBudget) * 100, 100), remaining: summary.monthlyIncidentalBudget - summary.monthlyIncidental, color: "#f72585" },
                { label: "Budget Streak", value: `${summary.streak} Days`, sub: `Best: ${summary.maxStreak}`, icon: TrendingUp, color: "var(--green)" },
              ].map((card: any) => (
                <div key={card.label} className="card card-hover" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: card.value ? 8 : 16 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{card.label}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: "var(--text)", fontFamily: "'DM Mono', monospace" }}>
                        {card.value || fmt(card.spent)}
                      </p>
                    </div>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <card.icon size={20} color={card.color} />
                    </div>
                  </div>
                  {card.value ? (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text2)" }}>{card.sub}</p>
                  ) : (
                    <>
                      <div className="progress-bar" style={{ marginBottom: 10 }}>
                        <div className="progress-fill" style={{ width: `${card.pct}%`, background: card.label === "Daily Survival" ? progressColor(card.pct) : "#f72585" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--text2)" }}>Budget: {fmt(card.budget)}</span>
                        <span style={{ color: card.remaining >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                          {card.remaining >= 0 ? `${fmt(card.remaining)} left` : `${fmt(Math.abs(card.remaining))} over`}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            {/* Smart Insights Section */}
            {( (summary.daily > summary.avgDaily * 1.5 && summary.avgDaily > 0) || (summary.topCategoryWeek) || (summary.daily < summary.avgDaily * 0.7 && summary.daily > 0) ) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 }}>
                {summary.daily > summary.avgDaily * 1.5 && summary.avgDaily > 0 && (
                  <div className="card" style={{ padding: 16, borderLeft: "4px solid var(--accent)", background: "rgba(124, 92, 252, 0.05)" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ padding: 8, borderRadius: 8, background: "rgba(124, 92, 252, 0.1)", color: "var(--accent)" }}>
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Spending Spike</h4>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text2)" }}>
                          Today is {Math.round((summary.daily / summary.avgDaily) * 100)}% higher than your avg.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {summary.topCategoryWeek && (
                  <div className="card" style={{ padding: 16, borderLeft: "4px solid #f72585", background: "rgba(247, 37, 133, 0.05)" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ padding: 8, borderRadius: 8, background: "rgba(247, 37, 133, 0.1)", color: "#f72585" }}>
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Weekly Top Spent</h4>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text2)" }}>
                          You've spent the most on <strong>{summary.topCategoryWeek._id}</strong> ({fmt(summary.topCategoryWeek.total)}) this week.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {summary.daily < summary.avgDaily * 0.7 && summary.daily > 0 && (
                  <div className="card" style={{ padding: 16, borderLeft: "4px solid var(--green)", background: "rgba(34, 211, 160, 0.05)" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ padding: 8, borderRadius: 8, background: "rgba(34, 211, 160, 0.1)", color: "var(--green)" }}>
                        <TrendingDown size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Good Savings</h4>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text2)" }}>
                          Today's spending is {Math.round((1 - summary.daily / summary.avgDaily) * 100)}% below your 30-day average!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* AI Forecast Card */}
            {summary.forecast && (
              <div className="card" style={{ padding: 24, marginBottom: 20, background: "linear-gradient(135deg, rgba(124, 92, 252, 0.05) 0%, rgba(34, 211, 160, 0.05) 100%)", border: "1px solid rgba(124, 92, 252, 0.2)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.1 }}>
                  <Sparkles size={120} color="var(--accent)" />
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ padding: 8, borderRadius: 10, background: "var(--accent)", color: "white", display: "flex" }}>
                        <TrendingUp size={16} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI Spending Forecast</h3>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{fmt(summary.forecast.projected)}</span>
                      <span style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>Projected Month End</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                      {summary.forecast.projected > dailyBudget * summary.forecast.totalDays ? (
                        <>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)" }} />
                          <span style={{ color: "var(--red)", fontSize: 13, fontWeight: 600 }}>Likely to overshoot by {fmt(summary.forecast.projected - (dailyBudget * summary.forecast.totalDays))}</span>
                        </>
                      ) : (
                        <>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} />
                          <span style={{ color: "var(--green)", fontSize: 13, fontWeight: 600 }}>You're on track to stay within budget!</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="card" style={{ padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", maxWidth: 220 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Smart AI Tip</div>
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "var(--text2)" }}>
                      {summary.forecast.projected > dailyBudget * summary.forecast.totalDays 
                        ? `Tone it down! To stay under budget, try to keep your daily spend around ${fmt(Math.max(0, (dailyBudget * summary.forecast.totalDays - summary.monthly) / summary.forecast.daysRemaining))} for the rest of the month.`
                        : `Great job! You have ${fmt((dailyBudget * summary.forecast.totalDays - summary.monthly) / summary.forecast.daysRemaining)} to spend daily for the next ${summary.forecast.daysRemaining} days.`
                      }
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 20, position: "relative", zIndex: 1 }}>
                  <div style={{ height: 6, width: "100%", background: "rgba(0,0,0,0.1)", borderRadius: 3 }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${Math.min((summary.monthly / (dailyBudget * summary.forecast.totalDays)) * 100, 100)}%`, 
                      background: "var(--accent)", 
                      borderRadius: 3,
                      boxShadow: "0 0 10px rgba(124, 92, 252, 0.4)"
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>
                    <span>SPENT: {fmt(summary.monthly)}</span>
                    <span>BUDGET: {fmt(dailyBudget * summary.forecast.totalDays)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Subscriptions Overview Card */}
            {summary.subscriptionTotal > 0 && (
              <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: "4px solid var(--blue)", background: "rgba(59, 130, 246, 0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ padding: 10, borderRadius: 10, background: "rgba(59, 130, 246, 0.1)", color: "var(--blue)" }}>
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recurring Payments</h4>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text2)" }}>
                        You have {fmt(summary.subscriptionTotal)} in monthly subscriptions.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTab("subscriptions")}
                    className="btn btn-secondary" 
                    style={{ padding: "8px 16px", fontSize: 12 }}
                  >
                    Manage
                  </button>
                </div>
              </div>
            )}

            {/* Quick stats with Progress Bars */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Daily Survival", spent: summary.daily, budget: dailyBudget, color: "var(--accent)", icon: IndianRupee },
                { label: "Monthly Total", spent: summary.monthly, budget: monthly, color: "var(--blue)", icon: TrendingUp },
                { label: "Monthly Random", spent: summary.monthlyIncidental, budget: summary.monthlyIncidentalBudget, color: "#f72585", icon: Sparkles },
              ].map(({ label, spent, budget, color, icon: Icon }) => {
                const pct = Math.min((spent / budget) * 100, 100);
                const remaining = budget - spent;
                return (
                  <div key={label} className="card card-hover" style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Icon size={14} color={color} />
                          <span style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", fontFamily: "'DM Mono', monospace" }}>
                          {fmt(spent)} <span style={{ fontSize: 13, color: "var(--text2)", fontWeight: 400 }}>/ {fmt(budget)}</span>
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: remaining >= 0 ? "var(--green)" : "var(--red)" }}>
                          {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over`}
                        </p>
                        <p style={{ margin: 0, fontSize: 10, color: "var(--text2)" }}>{Math.round(pct)}% used</p>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mini chart - Dynamic trend */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Spending Trend ({trendPeriod})
                </h3>
                <select 
                  className="input-field" 
                  style={{ width: 100, padding: "4px 8px", fontSize: 11, background: "var(--bg3)" }}
                  value={trendPeriod}
                  onChange={(e) => setTrendPeriod(e.target.value as any)}
                >
                  <option value="weekly">Last 7d</option>
                  <option value="monthly">Last 30d</option>
                  <option value="yearly">Last 1y</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text2)" }} tickLine={false} axisLine={false} interval={trendPeriod === "yearly" ? 4 : 1} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text2)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Area type="monotone" dataKey="spent" name="Spent" stroke="#7c5cfc" fill="url(#spendGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="budget" name="Budget" stroke="#22d3a0" fill="none" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* New Insights Section: Essentials Ratio & Spending Velocity */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginTop: 20 }}>
              {/* Essentials vs Lifestyle Donut */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Survival vs Lifestyle
                  </h3>
                  <select 
                    className="input-field" 
                    style={{ width: 80, padding: "4px 8px", fontSize: 11, background: "var(--bg3)" }}
                    value={ratioPeriod}
                    onChange={(e) => setRatioPeriod(e.target.value as any)}
                  >
                    <option value="week">7d</option>
                    <option value="month">1mo</option>
                    <option value="year">1yr</option>
                  </select>
                </div>
                <div style={{ height: 200, position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.essentialsRatio[ratioPeriod] || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(charts.essentialsRatio[ratioPeriod] || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", marginTop: -18 }}>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--text2)", textTransform: "uppercase" }}>Ratio</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                      {(() => {
                        const data = charts.essentialsRatio[ratioPeriod] || [];
                        const survival = data.find(d => d.name === "Survival")?.value || 0;
                        const total = data.reduce((sum, d) => sum + d.value, 0);
                        return total > 0 ? Math.round((survival / total) * 100) : 0;
                      })()}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Incidental Velocity Chart */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Incidental Burn Rate
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={charts.velocityData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="actual" name="Actual Spending" stroke="#f72585" fill="rgba(247, 37, 133, 0.1)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="ideal" name="Ideal Budget" stroke="var(--text2)" fill="none" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekend/Day-of-Week Heatmap */}
            <div className="card" style={{ padding: 20, marginTop: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Random Spending Day-Pattern (Last 30d)
                </h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={(charts.incidentalDayPattern || []).map(d => ({ name: WEEKDAYS[d._id - 1], spent: d.total }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="spent" name="Spent" radius={[4, 4, 0, 0]}>
                      {(charts.incidentalDayPattern || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry._id === 1 || entry._id === 7 ? "#f72585" : "#ffbd00"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 12, fontSize: 11, color: "var(--text2)", textAlign: "center" }}>
                    <span style={{ color: "#f72585" }}>● Weekends</span> vs <span style={{ color: "#ffbd00" }}>● Weekdays</span>
                </div>
            </div>
          </div>
        )}

        {/* ADD EXPENSE TAB */}
        {tab === "add" && (
          <div className="animate-slide-up" style={{ maxWidth: 600, width: "100%", margin: "0 auto", padding: "40px 0", minHeight: "calc(100vh - 300px)", display: "flex", alignItems: "center" }}>
            <div className="card" style={{ padding: 30, background: "var(--bg2)", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", width: "100%" }}>
              <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>Add New Expense</h2>
              <form onSubmit={handleAddExpense}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount ({currencySymbol}) *</label>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    style={{ fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Category *</label>
                  <select
                    className="input-field"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description *</label>
                  <input
                    className="input-field"
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g. Lunch at Office"
                    required
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Expense Type</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "daily" })}
                      style={{
                        padding: "12px",
                        borderRadius: 12,
                        border: form.type === "daily" ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: form.type === "daily" ? "rgba(124, 92, 252, 0.1)" : "var(--bg3)",
                        color: form.type === "daily" ? "var(--accent)" : "var(--text2)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>Daily Survival</span>
                        <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Food, Transport, Groceries</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "incidental" })}
                      style={{
                        padding: "12px",
                        borderRadius: 12,
                        border: form.type === "incidental" ? "1px solid #f72585" : "1px solid var(--border)",
                        background: form.type === "incidental" ? "rgba(247, 37, 133, 0.1)" : "var(--bg3)",
                        color: form.type === "incidental" ? "#f72585" : "var(--text2)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>Incidental / Random</span>
                        <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Movies, Parties, Shopping</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Location (Optional)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      type="button"
                      disabled={isLocating}
                      onClick={handleGetLocation}
                      className="btn-secondary"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px" }}
                    >
                      {isLocating ? <RefreshCw className="animate-spin" size={18} /> : <Locate size={18} />}
                      {isLocating ? "Getting Location..." : form.location ? "Location Updated" : "Tag Current Location"}
                    </button>
                  </div>
                  {form.location && (
                    <div style={{ margin: "8px 0 0", fontSize: 11, color: "var(--green)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Locate size={12} />
                      {form.location.name ? (
                        <span style={{ fontWeight: 600 }}>Area: {form.location.name}</span>
                      ) : (
                        <span>Coordinates: {form.location.latitude.toFixed(4)}, {form.location.longitude.toFixed(4)}</span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</label>
                  <input
                    className="input-field"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>

                {/* Budget preview */}
                {form.amount && (
                  <div style={{ background: "var(--bg3)", borderRadius: 12, padding: "14px 16px", marginBottom: 20, border: "1px solid var(--border)" }}>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text2)" }}>After this expense, today's total would be:</p>
                    <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: (summary.daily + parseFloat(form.amount || "0")) > dailyBudget ? "var(--red)" : "var(--green)" }}>
                      {fmt(summary.daily + parseFloat(form.amount || "0"))} / {fmt(dailyBudget)}
                    </p>
                  </div>
                )}

                <button className="btn-primary" type="submit" disabled={submitting} style={{ width: "100%", padding: "13px", fontSize: 15 }}>
                  {submitting ? "Adding..." : "Add Expense"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CHARTS TAB */}
        {tab === "charts" && (
          <div className="animate-slide-up">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 16, marginBottom: 16 }}>
              {/* Category Pie */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Spending by Category
                  </h3>
                  <select 
                    className="input-field" 
                    style={{ width: 100, padding: "4px 8px", fontSize: 11, background: "var(--bg3)" }}
                    value={categoryPeriod}
                    onChange={(e) => setCategoryPeriod(e.target.value as any)}
                  >
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(v) => <span style={{ color: "var(--text2)", fontSize: 12 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p style={{ color: "var(--text2)", fontSize: 13 }}>No data yet</p>}
              </div>

              {/* Category Bar */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Top Categories</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={pieData.slice(0, 6)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text2)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--text2)" }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                      <Bar dataKey="value" name="Spent" radius={[0, 6, 6, 0]}>
                        {pieData.slice(0, 6).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p style={{ color: "var(--text2)", fontSize: 13 }}>No data yet</p>}
              </div>
            </div>

            {/* MoM Comparison Chart */}
            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Month-over-Month Comparison</h3>
                <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)" }} />
                    <span style={{ color: "var(--text2)" }}>This Month ({fmt(summary.comparison.thisMonth.total)})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--border2)" }} />
                    <span style={{ color: "var(--text2)" }}>Last Month ({fmt(summary.comparison.lastMonth.total)})</span>
                  </div>
                </div>
              </div>
              
              {(() => {
                const comparisonData = CATEGORIES.map(cat => ({
                  name: cat,
                  thisMonth: (summary.comparison.thisMonth.categories as any[]).find((c: any) => c._id === cat)?.total || 0,
                  lastMonth: (summary.comparison.lastMonth.categories as any[]).find((c: any) => c._id === cat)?.total || 0,
                })).filter(d => d.thisMonth > 0 || d.lastMonth > 0);

                return comparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(124, 92, 252, 0.05)" }} />
                      <Bar dataKey="thisMonth" name="This Month" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="lastMonth" name="Last Month" fill="var(--border2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p style={{ color: "var(--text2)", fontSize: 13, textAlign: "center", padding: 40 }}>Not enough data for comparison yet.</p>;
              })()}
            </div>

            {/* Daily trend full */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Daily Spending — Last 30 Days</h3>
              {dailyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text2)" }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text2)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                    <Bar dataKey="spent" name="Spent" fill="#7c5cfc" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="budget" name="Budget" fill="#22d3a060" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: "var(--text2)", fontSize: 13 }}>No data yet</p>}
            </div>

            {/* Monthly trend */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monthly Spending — Last 12 Months</h3>
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyTrendData}>
                    <defs>
                      <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4da6ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4da6ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text2)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text2)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Area type="monotone" dataKey="spent" name="Spent" stroke="#4da6ff" fill="url(#monthGrad)" strokeWidth={2} dot={{ fill: "#4da6ff", r: 4 }} />
                    <Area type="monotone" dataKey="budget" name="Budget" stroke="#ffd166" fill="none" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p style={{ color: "var(--text2)", fontSize: 13 }}>No data yet</p>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 16 }}>
              {/* Weekly Pattern */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Weekly Pattern</h3>
                {weeklyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text2)" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--text2)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                      <Bar dataKey="spent" name="Spent" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p style={{ color: "var(--text2)", fontSize: 13 }}>No data yet</p>}
              </div>

              {/* Insights Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card" style={{ padding: 20, flex: 1, borderLeft: "4px solid var(--accent)" }}>
                  <h1 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase" }}>Monthly Insight</h1>
                  {summary.maxExpense ? (
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>Biggest expense this month:</p>
                      <p style={{ margin: "6px 0 2px", fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "'DM Mono', monospace" }}>{fmt(summary.maxExpense.amount)}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--accent2)" }}>{summary.maxExpense.description} ({summary.maxExpense.category})</p>
                    </div>
                  ) : <p style={{ color: "var(--text2)", fontSize: 13 }}>No expenses yet</p>}
                </div>
                <div className="card" style={{ padding: 20, flex: 1, borderLeft: "4px solid var(--green)" }}>
                  <h1 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase" }}>Frequent Category</h1>
                  {charts.categories.month?.length > 0 ? (
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>You spend most often on:</p>
                      <p style={{ margin: "6px 0 2px", fontSize: 18, fontWeight: 700, color: "var(--green)" }}>{charts.categories.month[0]._id}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text2)" }}>{charts.categories.month[0].count} transactions this month</p>
                    </div>
                  ) : <p style={{ color: "var(--text2)", fontSize: 13 }}>No data yet</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {tab === "subscriptions" && (
          <div className="animate-slide-up">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 24 }}>
              {/* Detected Subscriptions */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Sparkles size={20} color="var(--accent)" />
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Detected Patterns</h2>
                </div>
                {detectedSubscriptions.length === 0 ? (
                  <p style={{ color: "var(--text2)", fontSize: 14 }}>No recurring patterns detected yet. Keep logging!</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {detectedSubscriptions.map((ds, i) => (
                      <div key={i} className="card" style={{ padding: 16, background: "var(--bg3)", border: "1px dashed var(--accent)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{ds.name}</h4>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text2)" }}>Appears {ds.occurrences} times recently</p>
                          </div>
                          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--accent)" }}>{currencySymbol}{ds.amount}</p>
                        </div>
                        <button 
                          className="btn-primary" 
                          style={{ width: "100%", marginTop: 12, padding: "8px", fontSize: 12 }}
                          onClick={async () => {
                            const userId = localStorage.getItem("expense_user_id");
                            if (!userId) return;
                            await fetch("/api/subscriptions", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", "x-user-id": userId },
                              body: JSON.stringify({ ...ds, isAutoDetected: true })
                            });
                            fetchData();
                          }}
                        >
                          Confirm as Subscription
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Subscriptions */}
              <div className="card" style={{ padding: 24 }}>
                <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Active Subscriptions</h2>
                {subscriptions.length === 0 ? (
                  <p style={{ color: "var(--text2)", fontSize: 14 }}>Add or confirm subscriptions to track fixed costs.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {subscriptions.map(s => (
                      <div key={s._id} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{s.name}</h4>
                          <span style={{ fontSize: 11, background: "rgba(124, 92, 252, 0.1)", color: "var(--accent)", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{s.category}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{currencySymbol}{s.amount}</p>
                          <button 
                            style={{ background: "none", border: "none", color: "#ff5370", fontSize: 11, cursor: "pointer", padding: 0 }}
                            onClick={() => handleDelete(s._id, "subscription")}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: 20, padding: 16, background: "var(--bg3)", borderRadius: 12, border: "1px solid var(--border)" }}>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text2)" }}>Total Fixed Costs:</p>
                      <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{currencySymbol}{subscriptions.reduce((sum, s) => sum + s.amount, 0)}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text2)" }}>/month</span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GOALS TAB */}
        {tab === "goals" && (
          <div className="animate-slide-up">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
              {/* Goals List */}
              <div className="card" style={{ padding: 24 }}>
                <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>Savings Goals</h2>
                {goals.length === 0 ? (
                  <p style={{ color: "var(--text2)" }}>Set a goal to start tracking your savings progress!</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {goals.map(g => {
                      const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
                      return (
                        <div key={g._id} className="card" style={{ padding: 20, borderLeft: `6px solid ${g.color || 'var(--accent)'}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{g.name}</h3>
                              {g.deadline && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text2)" }}>Target: {fmtDate(g.deadline)}</p>}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{fmt(g.currentAmount)}</p>
                              <p style={{ margin: 0, fontSize: 12, color: "var(--text2)" }}>of {fmt(g.targetAmount)}</p>
                            </div>
                          </div>
                          <div style={{ height: 12, background: "var(--bg3)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                            <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: g.color || 'var(--accent)', transition: "width 0.5s ease" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: g.color || 'var(--accent)' }}>{Math.round(pct)}% Complete</span>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button 
                                className="nav-link" 
                                style={{ padding: "4px 10px", fontSize: 12 }}
                                onClick={() => setModal({ type: "add-funds", data: { id: g._id, name: g.name, current: g.currentAmount } })}
                              >
                                + Add Funds
                              </button>
                              <button 
                                onClick={() => handleDelete(g._id, "goal")}
                                style={{ background: "none", border: "none", color: "#ff5370", fontSize: 12, cursor: "pointer" }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Goal Form */}
              <div className="card" style={{ padding: 24, height: "fit-content" }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>🏆 Set New Goal</h3>
                <form onSubmit={async (e: any) => {
                  e.preventDefault();
                  const userId = localStorage.getItem("expense_user_id");
                  if (!userId) return;
                  const target = e.target;
                  await fetch("/api/goals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-user-id": userId },
                    body: JSON.stringify({
                      name: target.name.value,
                      targetAmount: parseFloat(target.amount.value),
                      deadline: target.deadline.value || undefined,
                      color: target.color.value
                    })
                  });
                  target.reset();
                  fetchData();
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>Goal Name</label>
                      <input name="name" required className="input-field" placeholder="e.g. New Laptop" />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>Target Amount ({currencySymbol})</label>
                      <input name="amount" type="number" required className="input-field" placeholder="50000" />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>Target Date (Optional)</label>
                      <input name="deadline" type="date" className="input-field" />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>Theme Color</label>
                      <input name="color" type="color" defaultValue="#7c5cfc" style={{ width: "100%", height: 40, border: "none", background: "none", cursor: "pointer" }} />
                    </div>
                    <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>Create Goal</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MAP TAB */}
        {tab === "map" && (
          <div className="animate-slide-up">
            <div className="card" style={{ padding: 24, minHeight: 600 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Spending Map</h2>
                <div style={{ fontSize: 13, background: "rgba(124, 92, 252, 0.1)", color: "var(--accent)", padding: "4px 12px", borderRadius: 20, fontWeight: 600 }}>
                  {expenses.filter(e => e.location).length} Geo-tagged
                </div>
              </div>
              
              <div id="spending-map-container" style={{ position: "relative" }}>
                {!expenses.some(e => e.location) ? (
                  <div style={{ height: 500, borderRadius: 16, background: "var(--bg3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center", padding: 40 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                      <Map size={32} style={{ opacity: 0.5 }} />
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>No map markers yet</h3>
                      <p style={{ margin: 0, fontSize: 14, color: "var(--text2)", maxWidth: 300 }}>Tag your next expense with a location to see it appear on your spending hotspots map!</p>
                    </div>
                  </div>
                ) : (
                  <MapView expenses={expenses} currencySymbol={currencySymbol} />
                )}
              </div>

              <div style={{ marginTop: 24, padding: "16px", background: "var(--bg3)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>Pro Tip: Location Insights</h4>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
                  Use the map to identify areas where your spending is highest. This can help you find expensive habits tied to specific neighborhoods or stores.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {tab === "logs" && (
          <div className="animate-slide-up">
            {/* Filter bar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text2)" }}>Show:</span>
              {(["all", "day", "month", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setLogPeriod(p)}
                  className={logPeriod === p ? "tab-active" : "tab-inactive"}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, transition: "all 0.2s" }}
                >
                  {p === "all" ? "All Time" : p === "day" ? "Today" : p === "month" ? "This Month" : "This Year"}
                </button>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255, 209, 102, 0.1)", padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(255, 209, 102, 0.2)" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Total:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#ffd166", fontFamily: "'DM Mono', monospace" }}>
                    {fmt(logPeriod === "all" ? summary.allTime : logPeriod === "day" ? summary.daily : logPeriod === "month" ? summary.monthly : summary.yearly)}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>{expenses.length} entries</span>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <p style={{ color: "var(--text2)", fontSize: 15 }}>No expenses found for this period.</p>
                <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setTab("add")}>Add your first expense</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {(() => {
                  const groups: { [key: string]: { date: string; items: Expense[]; total: number } } = {};
                  expenses.forEach((exp) => {
                    const d = new Date(exp.date);
                    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                    if (!groups[key]) groups[key] = { date: exp.date, items: [], total: 0 };
                    groups[key].items.push(exp);
                    groups[key].total += exp.amount;
                  });

                  return Object.values(groups)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((group) => (
                      <div key={group.date}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <CalendarDays size={14} color="var(--accent)" />
                            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {fmtDate(group.date)}
                            </h3>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", background: "var(--bg3)", padding: "4px 10px", borderRadius: 6, fontFamily: "'DM Mono', monospace" }}>
                            Total: {fmt(group.total)}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {group.items.map((exp, i) => (
                            <div key={exp._id} className="card card-hover" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${COLORS[CATEGORIES.indexOf(exp.category) % COLORS.length]}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span style={{ fontSize: 18 }}>
                                  {exp.category === "Food & Dining" ? "🍜" : exp.category === "Transport" ? "🚗" : exp.category === "Shopping" ? "🛍️" : exp.category === "Entertainment" ? "🎬" : exp.category === "Health" ? "💊" : exp.category === "Bills & Utilities" ? "💡" : exp.category === "Education" ? "📚" : exp.category === "Travel" ? "✈️" : exp.category === "Groceries" ? "🛒" : "📦"}
                                </span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.description}</p>
                                <div style={{ display: "flex", gap: 12, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 10, color: "var(--text2)", background: "var(--bg3)", borderRadius: 5, padding: "1px 7px", fontWeight: 600, textTransform: "uppercase" }}>{exp.category}</span>
                                  {exp.location && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent)", fontSize: 10 }}>
                                      <Locate size={10} />
                                      <span title={exp.location.name} style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {exp.location.name || `${exp.location.latitude.toFixed(4)}, ${exp.location.longitude.toFixed(4)}`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                                {fmt(exp.amount)}
                              </p>
                              <button
                                onClick={() => handleDelete(exp._id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", padding: 6, borderRadius: 8, display: "flex", transition: "color 0.2s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                })()}
              </div>
            )}
          </div>
        )}

        {/* AI CHAT TAB */}
        {tab === "chat" && <AIChat userId={localStorage.getItem("expense_user_id") || ""} currency={currency} currencySymbol={currencySymbol} />}

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div className="animate-slide-up" style={{ maxWidth: 800, margin: "0 auto" }}>
            <div className="card" style={{ padding: 32, background: "var(--bg2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(124, 92, 252, 0.1)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={32} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>User Management</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text2)" }}>{localStorage.getItem("expense_user_email")}</p>
                </div>
                <button onClick={handleLogout} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, border: "1px solid var(--red)", background: "rgba(255, 83, 112, 0.05)", color: "var(--red)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                  <LogOutIcon size={18} /> Logout
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                {/* Left Column: Budgets */}
                <div>
                  <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
                    <Wallet size={20} className="text-accent" /> Budget Settings
                  </h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div className="card" style={{ padding: 16, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8, fontWeight: 600 }}>DAILY SURVIVAL BUDGET</label>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text2)", fontSize: 14 }}>{currencySymbol}</span>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{ paddingLeft: 30 }}
                            value={newBudget || dailyBudget} 
                            onChange={(e) => setNewBudget(e.target.value)}
                          />
                        </div>
                        <button className="btn-primary" style={{ padding: "0 16px" }} onClick={handleBudgetSave}>Update</button>
                      </div>
                    </div>

                    <div className="card" style={{ padding: 16, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8, fontWeight: 600 }}>MONTHLY INCIDENTAL BUDGET</label>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text2)", fontSize: 14 }}>{currencySymbol}</span>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{ paddingLeft: 30 }}
                            value={newIncidentalBudget || summary.monthlyIncidentalBudget} 
                            onChange={(e) => setNewIncidentalBudget(e.target.value)}
                          />
                        </div>
                        <button className="btn-primary" style={{ padding: "0 16px", background: "#f72585" }} onClick={handleIncidentalBudgetSave}>Update</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Preferences */}
                <div>
                  <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
                    <Map size={20} className="text-accent" /> Preferences
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div className="card" style={{ padding: 16, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8, fontWeight: 600 }}>PREFERRED CURRENCY</label>
                      <select 
                        className="input-field" 
                        value={currency} 
                        onChange={async (e) => {
                          const code = e.target.value;
                          const symbol = CURRENCIES.find(c => c.code === code)?.symbol || "$";
                          setCurrency(code);
                          setCurrencySymbol(symbol);
                          
                          const userId = localStorage.getItem("expense_user_id");
                          const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                          await fetch("/api/user", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "x-user-id": userId || "", "x-timezone": userTz },
                            body: JSON.stringify({ currency: code, currencySymbol: symbol })
                          });
                        }}
                      >
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                      </select>
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text2)" }}>This will update all historical displays to use {currency} symbols.</p>
                    </div>

                    <div className="card" style={{ padding: 16, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8, fontWeight: 600 }}>TIMEZONE & COUNTRY</label>
                      <div style={{ padding: "10px 12px", background: "var(--bg2)", borderRadius: 8, fontSize: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ color: "var(--text2)" }}>Current Region:</span>
                          <span style={{ fontWeight: 600 }}>{country || "Unknown"}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text2)" }}>Detect Timezone:</span>
                          <span style={{ fontWeight: 600 }}>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal 
        isOpen={modal.type === "confirm-delete"} 
        onClose={() => setModal({ type: null, data: null })}
        title={modal.data?.title || "Confirm Deletion"}
        type="danger"
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255, 83, 112, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Trash2 size={24} color="var(--red)" />
          </div>
          <p style={{ margin: "0 0 24px", color: "var(--text2)", fontSize: 14, lineHeight: 1.6 }}>{modal.data?.message}</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setModal({ type: null, data: null })}>Cancel</button>
            <button className="btn-primary" style={{ flex: 1, background: "var(--red)" }} onClick={modal.data?.onConfirm}>Delete</button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={modal.type === "add-funds"} 
        onClose={() => setModal({ type: null, data: null })}
        title={`Add Funds: ${modal.data?.name}`}
      >
        <form onSubmit={async (e: any) => {
          e.preventDefault();
          const userId = localStorage.getItem("expense_user_id");
          if (!userId) return;
          const amt = parseFloat(e.target.amount.value);
          if (amt > 0) {
            await fetch("/api/goals", {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "x-user-id": userId },
              body: JSON.stringify({ id: modal.data.id, currentAmount: modal.data.current + amt })
            });
            setModal({ type: null, data: null });
            fetchData();
          }
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8 }}>Amount to add ({currencySymbol})</label>
              <input name="amount" type="number" required autoFocus className="input-field" placeholder="1000" />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setModal({ type: null, data: null })}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>Confirm</button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={modal.type === "flash-alert"} 
        onClose={() => setModal({ type: null, data: null })}
        title="⚠️ Flash Alert"
        type="danger"
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255, 83, 112, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <AlertTriangle size={24} color="var(--red)" />
          </div>
          <p style={{ margin: "0 0 24px", color: "var(--text2)", fontSize: 14, lineHeight: 1.6 }}>{modal.data?.message}</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setModal({ type: null, data: null })}>Go Back</button>
            <button className="btn-primary" style={{ flex: 1, background: "var(--red)" }} onClick={modal.data?.onConfirm}>Proceed Anyway</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
