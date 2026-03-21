"use client";

import { useState, useEffect } from "react";
import { PlusCircle, RefreshCw, Locate, X } from "lucide-react";
import { CATEGORIES } from "@/types";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currencySymbol: string;
  dailyBudget: number;
  currentDailyTotal: number;
  fmt: (n: number) => string;
}

export default function AddExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  currencySymbol,
  dailyBudget,
  currentDailyTotal,
  fmt
}: AddExpenseModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        amount: "",
        category: CATEGORIES[0],
        description: "",
        type: "daily",
        date: getLocalISODate(),
        location: null,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
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
      alert("Unable to retrieve your location. Please check your permissions.");
      setIsLocating(false);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description) return;

    const userId = localStorage.getItem("expense_user_id");
    if (!userId) return;

    setSubmitting(true);
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId, "x-timezone": userTz },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Failed to add expense", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {/* Backdrop */}
      <div 
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="card animate-scale-in" style={{ 
        position: "relative", 
        width: "100%", 
        maxWidth: 500, 
        padding: 0, 
        overflow: "hidden", 
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        background: "var(--bg1)",
        border: "1px solid var(--border)"
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(124, 92, 252, 0.1)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PlusCircle size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add New Expense</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", display: "flex", padding: 8, transition: "all 0.2s" }} className="hover-scale">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: 24, maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Amount ({currencySymbol}) *</label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                style={{ fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace", padding: "12px 16px" }}
                autoFocus
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Category *</label>
                <select
                  className="input-field"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{ padding: "10px 12px" }}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Date</label>
                <input
                  className="input-field"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  style={{ padding: "10px 12px" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Description *</label>
              <input
                className="input-field"
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Lunch at Office"
                required
                style={{ padding: "10px 12px" }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Expense Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "daily" })}
                  style={{
                    padding: "14px",
                    borderRadius: 14,
                    border: form.type === "daily" ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: form.type === "daily" ? "rgba(124, 92, 252, 0.1)" : "var(--bg3)",
                    color: form.type === "daily" ? "var(--accent)" : "var(--text2)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span>Daily Survival</span>
                    <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Essential Needs</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "incidental" })}
                  style={{
                    padding: "14px",
                    borderRadius: 14,
                    border: form.type === "incidental" ? "1px solid #f72585" : "1px solid var(--border)",
                    background: form.type === "incidental" ? "rgba(247, 37, 133, 0.1)" : "var(--bg3)",
                    color: form.type === "incidental" ? "#f72585" : "var(--text2)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span>Incidental</span>
                    <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Wants & Fun</span>
                  </div>
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Location (Optional)</label>
              <button 
                type="button"
                disabled={isLocating}
                onClick={handleGetLocation}
                className="btn-secondary"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12 }}
              >
                {isLocating ? <RefreshCw className="animate-spin" size={18} /> : <Locate size={18} />}
                {isLocating ? "Getting Location..." : form.location ? "Location Updated" : "Tag Current Location"}
              </button>
              {form.location && (
                <div style={{ margin: "10px 0 0", fontSize: 11, color: "var(--green)", padding: "8px 12px", background: "rgba(34, 211, 160, 0.05)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(34, 211, 160, 0.1)" }}>
                  <Locate size={14} />
                  <span style={{ fontWeight: 600 }}>{form.location.name || `${form.location.latitude.toFixed(4)}, ${form.location.longitude.toFixed(4)}`}</span>
                </div>
              )}
            </div>

            {/* Budget preview */}
            {form.type === "daily" && form.amount && !isNaN(parseFloat(form.amount)) && (
              <div style={{ background: "var(--bg3)", borderRadius: 16, padding: "16px", marginBottom: 24, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>Budget Impact:</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: (currentDailyTotal + parseFloat(form.amount)) > dailyBudget ? "var(--red)" : "var(--green)" }}>
                    {fmt(currentDailyTotal + parseFloat(form.amount))}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text2)", opacity: 0.7 }}>/ {fmt(dailyBudget)} daily</span>
                </div>
                <div style={{ width: "100%", height: 6, background: "var(--bg4)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${Math.min(100, ((currentDailyTotal + parseFloat(form.amount)) / dailyBudget) * 100)}%`,
                    background: (currentDailyTotal + parseFloat(form.amount)) > dailyBudget ? "var(--red)" : "var(--green)",
                    transition: "width 0.3s ease"
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button 
                type="button" 
                onClick={onClose} 
                className="btn-secondary" 
                style={{ flex: 1, padding: "13px" }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                type="submit" 
                disabled={submitting} 
                style={{ flex: 2, padding: "13px", fontSize: 15, fontWeight: 700 }}
              >
                {submitting ? "Adding..." : "Add Expense"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
