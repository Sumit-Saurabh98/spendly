"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, PlusCircle, BarChart3, List, AlertTriangle,
  TrendingUp, TrendingDown, Wallet, Calendar, CalendarDays,
  CalendarRange, Trash2, RefreshCw, Settings, IndianRupee, MessageSquare, Sparkles,
  Lock, ShieldCheck, Key, Map, Locate
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

type Tab = "overview" | "add" | "charts" | "logs" | "map" | "chat";

interface Expense {
  _id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  location?: { latitude: number; longitude: number; name?: string };
  createdAt: string;
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
  const [passkey, setPasskey] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [tab, setTab] = useState<Tab>("overview");
  const [dailyBudget, setDailyBudget] = useState(100);
  const [newBudget, setNewBudget] = useState("");
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState({ daily: 0, monthly: 0, yearly: 0, allTime: 0, maxExpense: null as any, avgDaily: 0, lateNight: { total: 0, count: 0 } });
  const [charts, setCharts] = useState<ChartData>({
    categories: { week: [], month: [], year: [] },
    dailyTrend: [], monthlyTrend: [], weeklyTrend: [], yearlyWeeklyTrend: [], weekdayPattern: [] 
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
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
      const expiry = localStorage.getItem("expense_auth_expiry");
      if (expiry && parseInt(expiry) > Date.now()) {
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkey) return;
    setIsAuthenticating(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: passkey }),
      });
      const data = await res.json();
      if (data.success) {
        const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
        localStorage.setItem("expense_auth_expiry", expiry.toString());
        setIsAuthenticated(true);
        setPasskey("");
      } else {
        setAuthError(data.error || "Invalid Secret Key");
      }
    } catch (err) {
      setAuthError("Server Error. Try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
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
      alert("Unable to get location");
      setIsLocating(false);
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetRes, expensesRes] = await Promise.all([
        fetch("/api/budget"),
        fetch(`/api/expenses?period=${logPeriod}&limit=100`),
      ]);
      const budgetData = await budgetRes.json();
      const expensesData = await expensesRes.json();

      setDailyBudget(budgetData.dailyBudget || 100);
      setExpenses(expensesData.expenses || []);
      setSummary(expensesData.summary || { daily: 0, monthly: 0, yearly: 0, allTime: 0, maxExpense: null as any, avgDaily: 0, lateNight: { total: 0, count: 0 } });
      setCharts(expensesData.charts || { categories: { week: [], month: [], year: [] }, dailyTrend: [], monthlyTrend: [], weeklyTrend: [], yearlyWeeklyTrend: [], weekdayPattern: [] });

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

    // Budget Breach Alert (20% of monthly budget)
    const monthlyBudget = dailyBudget * 31;
    const amountNum = parseFloat(form.amount);
    if (amountNum > monthlyBudget * 0.2) {
      const confirmBreach = window.confirm(`⚠️ Flash Alert: This expense (₹${amountNum}) is more than 20% of your total monthly budget (₹${monthlyBudget}). Proceed?`);
      if (!confirmBreach) return;

      // Send Email Notification
      fetch("/api/notify/breach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum, monthBudget: monthlyBudget, description: form.description }),
      }).catch(err => console.error("Email notify failed", err));
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const handleDelete = async (id: string) => {
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleBudgetSave = async () => {
    const val = parseFloat(newBudget);
    if (!val || val <= 0) return;
    await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
              <Lock size={32} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", color: "var(--text)" }}>Access Protected</h1>
            <p style={{ fontSize: 14, color: "var(--text2)", margin: "0 0 32px" }}>Enter your secret key to access the tracker</p>
            
            <form onSubmit={handleVerify}>
              <div style={{ position: "relative", marginBottom: 20 }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text2)" }}>
                  <Key size={18} />
                </div>
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter secret key..."
                  autoFocus
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
              </div>
              
              {authError && (
                <p style={{ color: "var(--red)", fontSize: 13, margin: "-12px 0 20px", fontWeight: 500 }}>{authError}</p>
              )}
              
              <button 
                type="submit" 
                disabled={isAuthenticating || !passkey}
                className="btn-primary" 
                style={{ width: "100%", padding: 14, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {isAuthenticating ? <RefreshCw className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                {isAuthenticating ? "Verifying..." : "Unlock Dashboard"}
              </button>
            </form>
          </div>
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text2)", opacity: 0.5 }}>
            Session will expire automatically after 10 minutes of inactivity.
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
      <div style={{ padding: "16px 24px 0", display: "flex", gap: 6 }}>
        {([
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "add", label: "Add Expense", icon: PlusCircle },
          { id: "charts", label: "Analytics", icon: BarChart3 },
          { id: "logs", label: "Logs", icon: List },
          { id: "chat", label: "AI Assistant", icon: Sparkles },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={tab === id ? "tab-active" : "tab-inactive"}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s" }}
          >
            <Icon size={15} />
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
            {( (summary.daily > summary.avgDaily * 1.5 && summary.avgDaily > 0) || (summary.lateNight?.total > 0) || (summary.daily < summary.avgDaily * 0.7 && summary.daily > 0) ) && (
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

                {summary.lateNight?.total > 0 && (
                  <div className="card" style={{ padding: 16, borderLeft: "4px solid #f72585", background: "rgba(247, 37, 133, 0.05)" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ padding: 8, borderRadius: 8, background: "rgba(247, 37, 133, 0.1)", color: "#f72585" }}>
                        <CalendarDays size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Late-Night Habit</h4>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text2)" }}>
                          You've spent {fmt(summary.lateNight.total)} late at night this week.
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

        {/* CHARTS TAB */}
        {tab === "charts" && (
          <div className="animate-slide-up">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
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
        {tab === "chat" && <AIChat />}
      </div>
    </div>
  );
}
