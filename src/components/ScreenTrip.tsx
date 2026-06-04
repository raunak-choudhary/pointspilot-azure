"use client";
import { useState } from "react";
import type { Card, TripIntent } from "@/types";
import { aiClassify } from "@/lib/ai";

interface Props {
  cards: Card[];
  onContinue: (intent: TripIntent) => void;
  onBack: () => void;
}

const PRIORITIES = [
  {
    value: "Rack up points",
    icon: "🚀",
    label: "Rack up points",
    desc: "Pay cash and maximize future earnings",
  },
  {
    value: "Redeem for this trip",
    icon: "🎯",
    label: "Redeem for this trip",
    desc: "Use existing points to cover the fare",
  },
  {
    value: "Spend the least cash",
    icon: "💰",
    label: "Spend the least cash",
    desc: "Minimize out-of-pocket cost any way possible",
  },
];

const SAMPLE_PROMPTS = [
  "I want to fly from NYC to LA next weekend and I care about comfort",
  "Dinner tonight at a nice restaurant in Manhattan",
  "Grocery run at Whole Foods, about $150",
  "I need to book a flight from JFK to SFO next month for work",
  "Amazon order for electronics, around $800",
  "Gas fill-up at the station",
];

export default function ScreenTrip({ cards, onContinue, onBack }: Props) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("Rack up points");
  const [loading, setLoading] = useState(false);
  const [classified, setClassified] = useState<{ category: string; summary: string } | null>(null);

  const hasBalance = cards.some((c) => c.points > 0);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await aiClassify(text);
      setClassified(result);
      const intent: TripIntent = {
        text,
        category: result.category,
        summary: result.summary,
        priority,
      };
      // Brief pause so user sees the classified tag
      await new Promise((r) => setTimeout(r, 600));
      onContinue(intent);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="screen-eyebrow">Step 2 of 3</div>
      <h1 className="screen-title">Describe your purchase</h1>
      <p className="screen-sub">
        Natural language — a trip, a dinner, a shopping run. We detect the category and match your best card.
      </p>

      <div className="trip-layout">
        {/* Left: text input */}
        <div>
          <label className="field-label">What are you spending on?</label>
          <textarea
            className="input-field"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="E.g. NYC to LA flight next weekend, I want to earn as many points as possible"
          />

          {classified && (
            <div className="classified-tag">
              ✓ Detected: {classified.category} · "{classified.summary}"
            </div>
          )}

          <div className="prompt-chips" style={{ marginTop: 16 }}>
            {SAMPLE_PROMPTS.map((p) => (
              <button key={p} className="chip" onClick={() => setText(p)}>
                {p.length > 40 ? p.slice(0, 40) + "…" : p}
              </button>
            ))}
          </div>

          {/* Cards in play summary */}
          <div
            style={{
              marginTop: 24, padding: "14px 16px",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>
              CARDS IN PLAY
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {cards.map((c) => (
                <span
                  key={c.id}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 12px",
                    background: "var(--surface-strong)", border: "1px solid var(--border)",
                    borderRadius: 20, fontSize: "0.8rem", color: "var(--text-muted)",
                  }}
                >
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: c.color, flexShrink: 0,
                    }}
                  />
                  {c.name}
                  {c.points > 0 && (
                    <span style={{ color: "var(--success)" }}>
                      {" "}· {c.points.toLocaleString()}pts
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: priority + actions */}
        <div>
          <div className="glass-card" style={{ marginBottom: 16 }}>
            <p className="field-label" style={{ marginBottom: 14 }}>What matters most?</p>
            {PRIORITIES.map((p) => {
              const disabled = p.value === "Redeem for this trip" && !hasBalance;
              return (
                <button
                  key={p.value}
                  className={`priority-option ${priority === p.value ? "selected" : ""}`}
                  onClick={() => !disabled && setPriority(p.value)}
                  disabled={disabled}
                  style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                >
                  <span className="priority-option-icon">{p.icon}</span>
                  <span className="priority-option-text">
                    <strong>{p.label}</strong>
                    <span>
                      {disabled ? "Add a point balance to unlock" : p.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              className="btn-primary btn-full"
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Classifying…
                </>
              ) : (
                "Get recommendations →"
              )}
            </button>
            <button className="btn-ghost btn-full" onClick={onBack}>
              ← Back to cards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
