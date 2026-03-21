"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, PlusCircle, BarChart3, List, AlertTriangle,
  TrendingUp, TrendingDown, Wallet, Calendar, CalendarDays,
  CalendarRange, Trash2, RefreshCw, Settings, IndianRupee, Sparkles,
  Lock, Key, Map, Locate, X, Mail,
  LogOutIcon
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { CATEGORIES } from "@/types";
import AIChat from "./AIChat";

const COLORS = ["#7c5cfc", "#22d3a0", "#ff5370", "#ffd166", "#4da6ff", "#ff8c42", "#b983ff", "#00b4d8", "#f72585", "#90e0ef"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const MapView = ({ expenses }: { expenses: Expense[] }) => {
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
            <div style="font-weight: 800; font-size: 18px; margin: 4px 0;">₹${ex.amount.toLocaleString('en-IN')}</div>
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

type Tab = "overview" | "add" | "charts" | "logs" | "map" | "subscriptions" | "goals" | "chat";

interface Expense {
  _id: string;
  amount: number;
  category: string;
  description: string;
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
  const [dailyBudget, setDailyBudget] = useState(100);
  const [newBudget, setNewBudget] = useState("");
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState({ 
    daily: 0, monthly: 0, yearly: 0, allTime: 0, maxExpense: null as any, avgDaily: 0, 
    topCategoryWeek: null as any,
    comparison: { thisMonth: { total: 0, categories: [] }, lastMonth: { total: 0, categories: [] } },
    forecast: { projected: 0, totalDays: 30, currentDay: 1, daysRemaining: 29 },
    subscriptionTotal: 0
  });
  const [charts, setCharts] = useState<ChartData>({
    categories: { week: [], month: [], year: [] },
    dailyTrend: [], monthlyTrend: [], weeklyTrend: [], yearlyWeeklyTrend: [], weekdayPattern: [] 
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
  const [logPeriod, setLogPeriod] = useState<"all" | "day" | "month" | "year">("month");
  const [trendPeriod, setTrendPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [categoryPeriod, setCategoryPeriod] = useState<"week" | "month" | "year">("year");

  const getISTDate = () => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  };

  const [form, setForm] = useState({
    amount: "",
    category: CATEGORIES[0],
    description: "",
    date: getISTDate(),
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
      const now = new Date();
      const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const hours = istTime.getHours();
      // Show reminder if after 9pm and no entries today
      if (hours >= 21 && summary.daily === 0 && isAuthenticated) {
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
  }, [summary.daily, isAuthenticated]);

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
      const [budgetRes, expensesRes, subsRes, goalsRes] = await Promise.all([
        fetch("/api/budget", { headers: { "x-user-id": userId } }),
        fetch(`/api/expenses?period=${logPeriod}&limit=100`, { headers: { "x-user-id": userId } }),
        fetch("/api/subscriptions", { headers: { "x-user-id": userId } }),
        fetch("/api/goals", { headers: { "x-user-id": userId } }),
      ]);
      const budgetData = await budgetRes.json();
      const expensesData = await expensesRes.json();
      const subsData = await subsRes.json();
      const goalsData = await goalsRes.json();

      setDailyBudget(budgetData.dailyBudget || 100);
      setExpenses(expensesData.expenses || []);
      setSummary(expensesData.summary);
      setCharts(expensesData.charts);
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
      fetch("/api/notify/breach", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ amount: amountNum, monthBudget: monthlyBudget, description: form.description }),
      }).catch(err => console.error("Email notify failed", err));

      setSubmitting(true);
      try {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": userId },
          body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
        });
        if (res.ok) {
          setForm({ amount: "", category: CATEGORIES[0], description: "", date: getISTDate(), location: null });
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
          message: `⚠️ Flash Alert: This expense (₹${amountNum}) is more than 20% of your total monthly budget (₹${monthlyBudget}). Proceed?`,
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
          {showBudgetEdit ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="input-field"
                style={{ width: 120 }}
                placeholder="Daily budget"
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                autoFocus
              />
              <button className="btn-primary" style={{ padding: "8px 14px" }} onClick={handleBudgetSave}>Save</button>
              <button onClick={() => setShowBudgetEdit(false)} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text2)", cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setShowBudgetEdit(true); setNewBudget(String(dailyBudget)); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", color: "var(--text2)", cursor: "pointer", fontSize: 13 }}
            >
              <Settings size={14} />
              <span>Budget: {fmt(dailyBudget)}/day</span>
            </button>
          )}
          <button onClick={handleLogout} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px", color: "var(--red)", cursor: "pointer", display: "flex" }} title="Logout">
            <LogOutIcon size={16} />
          </button>
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
            {/* Budget Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Today", spent: summary.daily, budget: dailyBudget, icon: CalendarDays, pct: dailyPct, remaining: dailyBudget - summary.daily },
                { label: "This Month", spent: summary.monthly, budget: monthly, icon: Calendar, pct: monthlyPct, remaining: monthly - summary.monthly },
                { label: "This Year", spent: summary.yearly, budget: yearly, icon: CalendarRange, pct: yearlyPct, remaining: yearly - summary.yearly },
              ].map(({ label, spent, budget, icon: Icon, pct, remaining }) => (
                <div key={label} className="card card-hover" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: "var(--text)", fontFamily: "'DM Mono', monospace" }}>
                        {fmt(spent)}
                      </p>
                    </div>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={20} color="var(--accent)" />
                    </div>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 10 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: progressColor(pct) }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--text2)" }}>Budget: {fmt(budget)}</span>
                    <span style={{ color: remaining >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                      {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over`}
                    </span>
                  </div>
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

            {/* Quick stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Daily Budget", value: fmt(dailyBudget), sub: "per day", color: "var(--accent)", icon: IndianRupee },
                { label: "Monthly Budget", value: fmt(monthly), sub: "× 31 days", color: "var(--blue)", icon: TrendingUp },
                { label: "Yearly Budget", value: fmt(yearly), sub: "× 12 months", color: "var(--green)", icon: CalendarRange },
                { label: "Avg / Day (Month)", value: fmt(Math.round(summary.monthly / new Date().getDate())), sub: "this month", color: "var(--yellow)", icon: TrendingDown },
              ].map(({ label, value, sub, color, icon: Icon }) => (
                <div key={label} className="card" style={{ padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Icon size={14} color={color} />
                    <span style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{value}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text2)" }}>{sub}</p>
                </div>
              ))}
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
          </div>
        )}

        {/* ADD EXPENSE TAB */}
        {tab === "add" && (
          <div className="animate-slide-up" style={{ maxWidth: 600, width: "100%", margin: "0 auto", padding: "40px 0", minHeight: "calc(100vh - 300px)", display: "flex", alignItems: "center" }}>
            <div className="card" style={{ padding: 30, background: "var(--bg2)", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", width: "100%" }}>
              <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>Add New Expense</h2>
              <form onSubmit={handleAddExpense}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount (₹) *</label>
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
                    placeholder="What did you spend on?"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
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
                          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--accent)" }}>₹{ds.amount}</p>
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
                          <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>₹{s.amount}</p>
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
                      <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "var(--text)" }}>₹{subscriptions.reduce((sum, s) => sum + s.amount, 0)}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text2)" }}>/month</span></p>
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
                      <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>Target Amount (₹)</label>
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
                  <MapView expenses={expenses} />
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
        {tab === "chat" && <AIChat userId={localStorage.getItem("expense_user_id") || ""} />}
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
              <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8 }}>Amount to add (₹)</label>
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
