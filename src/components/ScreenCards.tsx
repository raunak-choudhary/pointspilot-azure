"use client";
import { useState, useRef } from "react";
import type { Card } from "@/types";
import { aiCardLookup } from "@/lib/ai";

interface Props {
  cards: Card[];
  onCardsChange: (cards: Card[]) => void;
  onContinue: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  travel: "Travel",
  dining: "Dining",
  groceries: "Groceries",
  gas: "Gas",
  streaming: "Streaming",
  online: "Online",
  other: "Other",
};

export default function ScreenCards({ cards, onCardsChange, onContinue }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addCard = async () => {
    const q = query.trim();
    if (!q) return;
    if (cards.some((c) => c.name.toLowerCase() === q.toLowerCase())) {
      setError("That card is already in your wallet.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const card = await aiCardLookup(q);
      onCardsChange([...cards, card]);
      setQuery("");
      inputRef.current?.focus();
    } catch {
      setError("Lookup failed — try a different card name.");
    } finally {
      setLoading(false);
    }
  };

  const removeCard = (id: string) => {
    onCardsChange(cards.filter((c) => c.id !== id));
  };

  const updateBalance = (id: string, points: number) => {
    onCardsChange(cards.map((c) => (c.id === id ? { ...c, points } : c)));
  };

  const topRates = (card: Card) =>
    Object.entries(card.r)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .filter(([, v]) => v > 1);

  return (
    <div className="animate-fade-up">
      <div className="screen-eyebrow">Step 1 of 3</div>
      <h1 className="screen-title">Add your cards</h1>
      <p className="screen-sub">
        Type any card name — we fetch live reward rates from the web. No login needed.
      </p>

      <div className="cards-layout">
        {/* Left: search + card list */}
        <div>
          <div className="card-search-wrap">
            <input
              ref={inputRef}
              className="input-field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCard()}
              placeholder='Type a card name — e.g. "Chase Sapphire Reserve"'
              disabled={loading}
            />
            <button
              className="btn-primary"
              onClick={addCard}
              disabled={loading || !query.trim()}
            >
              {loading ? <span className="spinner" /> : "Add"}
            </button>
          </div>

          {loading && (
            <div className="loading-line">
              <span className="spinner" />
              Fetching live reward rates via web search…
            </div>
          )}

          {error && (
            <p style={{ color: "var(--error)", fontSize: "0.85rem", marginBottom: 12 }}>
              {error}
            </p>
          )}

          {/* Quick-add chips */}
          <div style={{ marginBottom: 24 }}>
            <p className="field-label" style={{ marginBottom: 10 }}>Popular cards</p>
            <div className="prompt-chips">
              {[
                "Chase Sapphire Reserve",
                "Amex Gold",
                "Amex Platinum",
                "Capital One Venture X",
                "Chase Freedom Unlimited",
              ].map((name) => (
                <button
                  key={name}
                  className="chip"
                  onClick={() => { setQuery(name); inputRef.current?.focus(); }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Added cards list */}
          {cards.length > 0 && (
            <div>
              <p className="field-label" style={{ marginBottom: 12 }}>
                Your wallet ({cards.length} card{cards.length !== 1 ? "s" : ""})
              </p>
              {cards.map((card) => {
                const top = topRates(card);
                return (
                  <div key={card.id} className="wallet-card animate-fade-up">
                    <div className="wallet-card-header">
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div
                          className="wallet-card-dot"
                          style={{ background: card.color }}
                        />
                        <div>
                          <div className="wallet-card-name">{card.name}</div>
                          <div className="wallet-card-issuer">
                            {card.issuer} · {card.cur}
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn-ghost"
                        onClick={() => removeCard(card.id)}
                        style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="wallet-card-rates">
                      {top.length > 0 ? (
                        top.map(([cat, rate]) => (
                          <span key={cat} className={`rate-chip ${rate >= 3 ? "highlight" : ""}`}>
                            {rate}x {CATEGORY_LABELS[cat] || cat}
                          </span>
                        ))
                      ) : (
                        <span className="rate-chip">1x everywhere</span>
                      )}
                    </div>

                    <div className="balance-row">
                      <span className="balance-label">{card.cur} balance:</span>
                      <input
                        type="number"
                        className="balance-input"
                        min={0}
                        value={card.points || ""}
                        placeholder="0 (optional)"
                        onChange={(e) => updateBalance(card.id, Number(e.target.value) || 0)}
                      />
                    </div>

                    {card.asOf && card.asOf !== "seeded" && (
                      <div className="source-line">
                        Rates fetched {card.asOf}
                        {card.sources.length > 0 && (
                          <>
                            {" · "}
                            {card.sources.slice(0, 2).map((s, i) => (
                              <span key={i}>
                                <a href={s.url} target="_blank" rel="noreferrer">
                                  {s.title.slice(0, 28)}…
                                </a>
                                {i < 1 && card.sources.length > 1 && ", "}
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                    {card.asOf === "seeded" && (
                      <div className="source-line">Using preset rates · Connect to Azure OpenAI for live data</div>
                    )}
                    {card.note && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                        {card.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: wallet summary panel */}
        <div className="wallet-panel">
          <div className="glass-card">
            <p style={{ fontWeight: 700, marginBottom: 16, color: "var(--text)" }}>Your wallet</p>
            {cards.length === 0 ? (
              <div className="wallet-empty">
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>💳</div>
                <p>Add at least one card to continue.</p>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                {cards.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: card.color, flexShrink: 0,
                      }}
                    />
                    <div style={{ fontSize: "0.85rem" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{card.name}</div>
                      {card.points > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {card.points.toLocaleString()} {card.cur}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn-primary btn-full"
              onClick={onContinue}
              disabled={cards.length === 0}
            >
              Continue to trip →
            </button>
          </div>

          <div
            style={{
              marginTop: 16, padding: "14px 16px",
              background: "var(--accent-muted)", border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-md)", fontSize: "0.8rem", color: "var(--accent)",
              lineHeight: 1.5,
            }}
          >
            💡 Balances are optional but improve the redemption recommendation.
          </div>
        </div>
      </div>
    </div>
  );
}
