"use client";
import dynamic from "next/dynamic";
import type { Card, TripIntent, Recommendation } from "@/types";

const CardScene = dynamic(() => import("./CardScene"), { ssr: false });

interface Props {
  cards: Card[];
  intent: TripIntent;
  recommendations: Recommendation[];
  onStartOver: () => void;
  onBack: () => void;
}

const BOOKING_URLS: Record<string, string> = {
  travel: "https://www.google.com/travel/flights",
  dining: "https://www.opentable.com",
  groceries: "https://www.instacart.com",
  online: "https://www.amazon.com",
  streaming: "https://www.netflix.com",
  gas: "https://www.gasbuddy.com",
  other: "https://www.google.com/search",
};

const CATEGORY_ICONS: Record<string, string> = {
  travel: "✈️", dining: "🍽️", groceries: "🛒",
  online: "📦", streaming: "📺", gas: "⛽", other: "💳",
};

export default function ScreenResults({ cards, intent, recommendations, onStartOver, onBack }: Props) {
  const winner = recommendations[0];

  const sceneCards = recommendations.map((rec, i) => ({
    name: rec.card.name,
    color: rec.card.color,
    isWinner: i === 0,
  }));

  const bookingUrl = BOOKING_URLS[intent.category] || BOOKING_URLS.other;

  const formatPoints = (n: number) =>
    n > 0 ? `+${n.toLocaleString()}` : n < 0 ? n.toLocaleString() : "—";

  return (
    <div className="animate-fade-up">
      {/* Trip pill */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 18px",
            background: "var(--surface-strong)", border: "1px solid var(--border)",
            borderRadius: 20, fontSize: "0.83rem", color: "var(--text-muted)",
          }}
        >
          <span>{CATEGORY_ICONS[intent.category] || "💳"}</span>
          <span style={{ color: "var(--text)", fontWeight: 600 }}>{intent.summary}</span>
          <span>·</span>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>{intent.priority}</span>
        </div>
      </div>

      {/* 3D card visualization */}
      {sceneCards.length > 0 && (
        <div
          style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "24px",
            marginBottom: 32, overflow: "hidden",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--accent)", marginBottom: 16,
              textAlign: "center",
            }}
          >
            Your cards · ranked for this purchase
          </p>
          <CardScene cards={sceneCards} />
          <p
            style={{
              textAlign: "center", fontSize: "0.78rem",
              color: "var(--text-dim)", marginTop: 12,
            }}
          >
            Spotlight = top pick
          </p>
        </div>
      )}

      {/* Winner highlight banner */}
      {winner && (
        <div
          style={{
            background: "var(--accent-muted)", border: "2px solid var(--border-accent)",
            borderRadius: "var(--radius-lg)", padding: "20px 24px",
            marginBottom: 24, display: "flex", alignItems: "center", gap: 16,
          }}
        >
          <div
            style={{
              width: 48, height: 48, borderRadius: 12,
              background: winner.card.color,
              boxShadow: "0 0 20px rgba(108,99,255,0.3)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Top recommendation
            </p>
            <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
              {winner.card.name}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 4 }}>
              {winner.why}
            </p>
          </div>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Book now →
          </a>
        </div>
      )}

      {/* All recommendation lanes */}
      <div className="results-grid">
        {recommendations.map((rec, i) => (
          <div key={rec.card.id + i} className={`lane-card animate-fade-up ${i === 0 ? "winner" : ""}`}
            style={{ animationDelay: `${i * 0.08}s` }}>
            <div>
              <span className="lane-badge">{rec.badge}</span>
            </div>
            <div>
              <div className="lane-title">{rec.title}</div>
              <div className="lane-card-name" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <div
                  style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: rec.card.color, flexShrink: 0,
                  }}
                />
                {rec.card.name}
              </div>
            </div>

            <div className="lane-metrics">
              <div className="lane-metric">
                <div className="lane-metric-label">Earn Rate</div>
                <div className={`lane-metric-value ${i === 0 ? "accent" : ""}`}>
                  {rec.rate}x
                </div>
              </div>
              <div className="lane-metric">
                <div className="lane-metric-label">Currency</div>
                <div className="lane-metric-value" style={{ fontSize: "0.82rem" }}>
                  {rec.card.cur}
                </div>
              </div>
              <div className="lane-metric">
                <div className="lane-metric-label">Pts Earned</div>
                <div className={`lane-metric-value ${rec.pointsEarned > 0 ? "success" : ""}`}>
                  {formatPoints(rec.pointsEarned)}
                </div>
              </div>
              <div className="lane-metric">
                <div className="lane-metric-label">Pts Spent</div>
                <div className={`lane-metric-value ${rec.pointsSpent > 0 ? "gold" : ""}`}>
                  {rec.pointsSpent > 0 ? rec.pointsSpent.toLocaleString() : "—"}
                </div>
              </div>
            </div>

            <p className="lane-why">{rec.why}</p>

            {rec.card.sources.length > 0 && (
              <div className="lane-sources">
                Rates: {" "}
                {rec.card.sources.slice(0, 1).map((s, si) => (
                  <a key={si} href={s.url} target="_blank" rel="noreferrer">
                    {s.title.slice(0, 30)}…
                  </a>
                ))}
                {rec.card.asOf && ` · ${rec.card.asOf}`}
              </div>
            )}

            <div className="lane-cta">
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className={i === 0 ? "btn-primary btn-full" : "btn-secondary btn-full"}
              >
                {i === 0 ? "Book with this card →" : "Use this path →"}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "center" }}>
        <button className="btn-ghost" onClick={onBack}>← Change trip details</button>
        <button className="btn-secondary" onClick={onStartOver}>Start over</button>
      </div>

      <p
        style={{
          textAlign: "center", fontSize: "0.75rem",
          color: "var(--text-dim)", marginTop: 20,
        }}
      >
        Rates fetched from live web via Tavily · Recommendations are deterministic math, not AI opinion
      </p>
    </div>
  );
}
