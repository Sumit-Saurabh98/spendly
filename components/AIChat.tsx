"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, ArrowRight } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string | Date;
}

const SUGGESTIONS = [
  "How much did I spend today?",
  "What's my biggest expense this month?",
  "Am I within my daily budget?",
  "Show me my recent food expenses",
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your AI Expense Assistant. Ask me anything about your spending, budgets, or transactions!", timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/chat");
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages([...newMessages, { role: "assistant", content: data.message }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card animate-slide-up" style={{ height: "calc(100vh - 180px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(124, 92, 252, 0.1)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={20} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI Financial Assistant</h2>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text2)" }}>Powered by OpenAI GPT-4o</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ display: "flex", gap: 12, width: "100%", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "assistant" && (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg3)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bot size={18} />
                </div>
              )}
              <div style={{
                maxWidth: "80%",
                padding: "12px 16px",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                background: m.role === "user" ? "var(--accent)" : "var(--bg3)",
                color: m.role === "user" ? "#fff" : "var(--text)",
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap"
              }}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User size={18} />
                </div>
              )}
            </div>
            <span style={{ fontSize: 10, color: "var(--text2)", opacity: 0.5, margin: m.role === "user" ? "0 44px 0 0" : "0 0 0 44px" }}>
              {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg3)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={18} />
            </div>
            <div style={{ padding: "12px 16px", background: "var(--bg3)", borderRadius: "4px 16px 16px 16px", display: "flex", alignItems: "center" }}>
              <Loader2 size={16} className="animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length < 3 && !loading && (
        <div style={{ padding: "0 20px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text2)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}
            >
              {s} <ArrowRight size={12} />
            </button>
          ))}
        </div>
      )}

      {/* Footer / Input */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          style={{ display: "flex", gap: 10, background: "var(--bg3)", padding: 6, borderRadius: 12, border: "1px solid var(--border)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            style={{ flex: 1, padding: "8px 12px", background: "transparent", border: "none", color: "var(--text)", outline: "none", fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 8, 
              background: input.trim() ? "var(--accent)" : "var(--bg4)", 
              color: "#fff", 
              border: "none", 
              cursor: input.trim() ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
