"use client";
import { useEffect, useState } from "react";
import type { Card, TripIntent } from "@/types";
import { aiRecommend, type AIRecommendation } from "@/lib/ai";

interface Props {
  cards: Card[];
  intent: TripIntent;
  onStartOver: () => void;
  onBack: () => void;
}

const BADGE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  "BEST OVERALL":     { bg: "#ede9fe", color: "#6c63ff", border: "#c4b5fd" },
  "BEST EARNINGS":    { bg: "#ecfdf5", color: "#059669", border: "#6ee7b7" },
  "BEST REDEMPTION":  { bg: "#fff7ed", color: "#d97706", border: "#fcd34d" },
};

const CATEGORY_ICONS: Record<string, string> = {
  travel: "✈️", dining: "🍽️", groceries: "🛒",
  online: "📦", streaming: "📺", gas: "⛽", other: "💳",
};

const CARD_PORTALS: Record<string, { label: string; url: string }> = {
  "chase sapphire reserve":     { label: "Chase Travel Portal", url: "https://travel.chase.com" },
  "chase sapphire preferred":   { label: "Chase Travel Portal", url: "https://travel.chase.com" },
  "chase freedom unlimited":    { label: "Chase Travel Portal", url: "https://travel.chase.com" },
  "amex platinum":              { label: "Amex Travel", url: "https://travel.americanexpress.com" },
  "american express platinum":  { label: "Amex Travel", url: "https://travel.americanexpress.com" },
  "amex gold":                  { label: "Amex Travel", url: "https://travel.americanexpress.com" },
  "american express gold":      { label: "Amex Travel", url: "https://travel.americanexpress.com" },
  "capital one venture x":      { label: "Capital One Travel", url: "https://travel.capitalone.com" },
  "capital one venture":        { label: "Capital One Travel", url: "https://travel.capitalone.com" },
  "citi premier":               { label: "Citi Travel", url: "https://travel.citi.com" },
  "delta skymiles reserve":     { label: "Delta.com", url: "https://www.delta.com/flight-search/book-a-flight" },
  "delta skymiles gold":        { label: "Delta.com", url: "https://www.delta.com/flight-search/book-a-flight" },
  "united explorer":            { label: "United.com", url: "https://www.united.com/en/us/book-flight" },
};

const CATEGORY_FALLBACK: Record<string, { label: string; url: string }> = {
  travel:     { label: "Google Flights", url: "https://www.google.com/travel/flights" },
  dining:     { label: "OpenTable", url: "https://www.opentable.com" },
  groceries:  { label: "Instacart", url: "https://www.instacart.com" },
  online:     { label: "Amazon", url: "https://www.amazon.com" },
  streaming:  { label: "Netflix", url: "https://www.netflix.com" },
  gas:        { label: "GasBuddy", url: "https://www.gasbuddy.com" },
  other:      { label: "Google", url: "https://www.google.com" },
};

function getBookingLink(cardName: string, category: string): { label: string; url: string } {
  const key = cardName.toLowerCase();
  for (const [k, v] of Object.entries(CARD_PORTALS)) {
    if (key.includes(k) || k.includes(key.split(" ").slice(0, 2).join(" "))) return v;
  }
  return CATEGORY_FALLBACK[category] || CATEGORY_FALLBACK.other;
}

export default function ScreenResults({ cards, intent, onStartOver, onBack }: Props) {
  const [recs, setRecs] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    aiRecommend(cards, intent).then((r) => {
      setRecs(r);
      setLoading(false);
    });
  }, [cards, intent]);

  const cardColor = (name: string) => {
    const found = cards.find(c => c.name === name);
    return found?.color || "#6c63ff";
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* Trip context pill */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "10px 20px",
          background: "#f0f0ff", border: "1px solid #c4b5fd",
          borderRadius: 24, fontSize: "0.9rem",
        }}>
          <span>{CATEGORY_ICONS[intent.category] || "💳"}</span>
          <span style={{ color: "#1a1a2e", fontWeight: 600 }}>{intent.summary || intent.text.slice(0, 60)}</span>
          <span style={{ color: "#9999bb" }}>·</span>
          <span style={{ color: "#6c63ff", fontWeight: 600 }}>{intent.priority}</span>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "#fff", borderRadius: 20,
          border: "1px solid #e8e8f0", boxShadow: "0 4px 24px rgba(108,99,255,0.08)",
        }}>
          <div style={{
            width: 48, height: 48, margin: "0 auto 20px",
            border: "3px solid #e8e8f0", borderTopColor: "#6c63ff",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ fontSize: "1.05rem", fontWeight: 600, color: "#1a1a2e", marginBottom: 6 }}>
            AI is analyzing your cards…
          </p>
          <p style={{ fontSize: "0.88rem", color: "#8888aa" }}>
            Building personalized recommendations for "{intent.text.slice(0, 50)}"
          </p>
        </div>
      )}

      {/* Recommendation cards */}
      {!loading && recs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {recs.map((rec, i) => {
            const style = BADGE_STYLE[rec.badge] || BADGE_STYLE["BEST OVERALL"];
            const color = cardColor(rec.card);
            return (
              <div
                key={i}
                style={{
                  background: "#fff",
                  border: `1px solid ${i === 0 ? "#c4b5fd" : "#e8e8f0"}`,
                  borderLeft: `4px solid ${i === 0 ? "#6c63ff" : i === 1 ? "#059669" : "#d97706"}`,
                  borderRadius: 16,
                  padding: "24px 28px",
                  boxShadow: i === 0 ? "0 4px 24px rgba(108,99,255,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {/* Badge + card name */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      padding: "4px 12px", borderRadius: 20,
                      fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em",
                      background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                    }}>
                      {rec.badge}
                    </span>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>
                      {rec.title}
                    </h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                    <span style={{ fontSize: "0.82rem", color: "#5a5a7a", fontWeight: 500 }}>{rec.card}</span>
                  </div>
                </div>

                {/* Action — the main AI text */}
                <p style={{
                  fontSize: "0.97rem", color: "#2a2a3e", lineHeight: 1.65,
                  marginBottom: 20, fontWeight: 400,
                }}>
                  {rec.action}
                </p>

                {/* Booking button */}
                {(() => {
                  const link = getBookingLink(rec.card, intent.category);
                  return (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "10px 20px", marginBottom: 16,
                        background: i === 0 ? "#6c63ff" : "#f0f0ff",
                        color: i === 0 ? "#fff" : "#6c63ff",
                        border: `1px solid ${i === 0 ? "#6c63ff" : "#c4b5fd"}`,
                        borderRadius: 10, fontSize: "0.88rem", fontWeight: 600,
                        textDecoration: "none", transition: "opacity 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                    >
                      {i === 0 ? "🔗" : "↗"} Book via {link.label}
                    </a>
                  );
                })()}

                {/* Metrics row */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{
                    flex: 1, minWidth: 140,
                    background: "#f8f8ff", border: "1px solid #e8e8f0",
                    borderRadius: 12, padding: "12px 16px",
                  }}>
                    <div style={{ fontSize: "0.7rem", color: "#9999bb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                      Points Impact
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: style.color }}>
                      {rec.points_impact}
                    </div>
                  </div>
                  <div style={{
                    flex: 1, minWidth: 140,
                    background: "#f8f8ff", border: "1px solid #e8e8f0",
                    borderRadius: 12, padding: "12px 16px",
                  }}>
                    <div style={{ fontSize: "0.7rem", color: "#9999bb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                      Dollar Value
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e" }}>
                      {rec.dollar_value}
                    </div>
                  </div>
                  <div style={{
                    flex: 2, minWidth: 200,
                    background: "#f8f8ff", border: "1px solid #e8e8f0",
                    borderRadius: 12, padding: "12px 16px",
                  }}>
                    <div style={{ fontSize: "0.7rem", color: "#9999bb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                      Why This Works
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#5a5a7a", lineHeight: 1.4 }}>
                      {rec.why}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cards in play summary */}
      {!loading && (
        <div style={{
          marginTop: 24, padding: "16px 20px",
          background: "#f8f8ff", border: "1px solid #e8e8f0",
          borderRadius: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.8rem", color: "#8888aa", fontWeight: 600 }}>CARDS ANALYZED:</span>
          {cards.map(c => (
            <span key={c.id} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 12px",
              background: "#fff", border: "1px solid #e8e8f0",
              borderRadius: 20, fontSize: "0.8rem", color: "#5a5a7a",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              {c.name}
              {c.points > 0 && <span style={{ color: "#6c63ff", fontWeight: 600 }}> · {c.points.toLocaleString()}pts</span>}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 28, justifyContent: "center" }}>
        <button onClick={onBack} style={{
          padding: "10px 22px", background: "transparent", color: "#8888aa",
          border: "1px solid #e8e8f0", borderRadius: 10, cursor: "pointer", fontSize: "0.9rem",
        }}>
          ← Change trip
        </button>
        <button onClick={onStartOver} style={{
          padding: "10px 22px", background: "#6c63ff", color: "#fff",
          border: "none", borderRadius: 10, cursor: "pointer", fontSize: "0.9rem", fontWeight: 600,
        }}>
          Start over
        </button>
      </div>

      <p style={{ textAlign: "center", fontSize: "0.73rem", color: "#c0c0d0", marginTop: 20 }}>
        Powered by Azure OpenAI · Recommendations are AI-generated based on your cards and intent
      </p>
    </div>
  );
}
