"use client";
import { useState, useEffect, useCallback } from "react";
import type { Card, TripIntent, Recommendation } from "@/types";
import { loadProfile, saveProfile } from "@/lib/supabase";
import { bestForTrip, bestForPurchase } from "@/lib/recommend";
import { aiCardLookup } from "@/lib/ai";
import ScreenCards from "@/components/ScreenCards";
import ScreenTrip from "@/components/ScreenTrip";
import ScreenResults from "@/components/ScreenResults";

type Screen = "landing" | "cards" | "trip" | "results";

const SAMPLE_CARDS = [
  "Chase Sapphire Reserve",
  "Amex Gold",
  "Capital One Venture X",
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [cards, setCards] = useState<Card[]>([]);
  const [intent, setIntent] = useState<TripIntent | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loadingSample, setLoadingSample] = useState(false);

  // Restore profile on mount
  useEffect(() => {
    loadProfile().then((profile) => {
      if (profile?.cards?.length) setCards(profile.cards);
    });
  }, []);

  // Persist cards whenever they change
  useEffect(() => {
    if (cards.length > 0) {
      saveProfile({ cards, uses: 1 });
    }
  }, [cards]);

  // Theme toggle
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const computeRecommendations = useCallback(
    (tripIntent: TripIntent, currentCards: Card[]) => {
      const isTravel = tripIntent.category === "travel";
      const recs = isTravel
        ? bestForTrip(currentCards, tripIntent.priority)
        : bestForPurchase(currentCards, tripIntent.category);
      setRecommendations(recs);
    },
    [],
  );

  const handleTripSubmit = (tripIntent: TripIntent) => {
    setIntent(tripIntent);
    computeRecommendations(tripIntent, cards);
    setScreen("results");
  };

  const handleStartOver = () => {
    setIntent(null);
    setRecommendations([]);
    setScreen("landing");
  };

  const handleLoadSample = async () => {
    setLoadingSample(true);
    try {
      const loaded: Card[] = [];
      for (const name of SAMPLE_CARDS) {
        const card = await aiCardLookup(name);
        loaded.push({ ...card, points: name.includes("Venture") ? 45000 : name.includes("Sapphire") ? 68000 : 0 });
      }
      setCards(loaded);
      setScreen("trip");
    } finally {
      setLoadingSample(false);
    }
  };

  const STEPS = ["Cards", "Purchase", "Results"];
  const stepIndex: Record<Screen, number> = { landing: -1, cards: 0, trip: 1, results: 2 };
  const currentStep = stepIndex[screen];

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Topbar */}
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span className="brand-dot" />
          <span className="brand-name">PointsPilot</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {screen !== "landing" && currentStep >= 0 && (
            <nav className="progress-nav">
              {STEPS.map((step, i) => (
                <span
                  key={step}
                  className={`progress-step ${
                    i === currentStep ? "active" : i < currentStep ? "done" : ""
                  }`}
                >
                  {i < currentStep ? "✓ " : `${i + 1}. `}{step}
                </span>
              ))}
            </nav>
          )}
          <button
            className="btn-ghost"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          {screen !== "landing" && (
            <button className="btn-ghost" onClick={handleStartOver}>
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        {/* ── Landing ── */}
        {screen === "landing" && (
          <div className="landing">
            <div style={{ maxWidth: 680, width: "100%" }}>
              <div className="landing-eyebrow">
                <span>✦</span> AI-powered · Live reward rates
              </div>
              <h1 className="landing-headline">
                Stop guessing which card to{" "}
                <span>swipe.</span>
              </h1>
              <p className="landing-sub">
                Describe your trip or purchase. PointsPilot fetches live reward rates from the web
                and picks the best card in your wallet — in seconds.
              </p>
              <div className="landing-actions">
                <button
                  className="btn-primary"
                  onClick={() => setScreen("cards")}
                  style={{ fontSize: "1rem", padding: "14px 36px" }}
                >
                  Add my cards →
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleLoadSample}
                  disabled={loadingSample}
                >
                  {loadingSample ? (
                    <>
                      <span className="spinner" />
                      Loading demo…
                    </>
                  ) : (
                    "Try demo with sample cards"
                  )}
                </button>
              </div>
            </div>

            <div
              className="stat-banner animate-fade-up animate-delay-1"
              style={{ maxWidth: 600 }}
            >
              💸 Americans leave <strong>$12 billion</strong> in credit card rewards unclaimed every year
              — the average cardholder misses <strong>$400+</strong> annually by using the wrong card.
            </div>

            <div className="landing-proof animate-fade-up animate-delay-2">
              <div className="proof-item">
                <div className="proof-icon">🌐</div>
                <div className="proof-title">Live reward data</div>
                <div className="proof-desc">
                  We search the web for current earn rates — not presets from last year.
                </div>
              </div>
              <div className="proof-item">
                <div className="proof-icon">🧮</div>
                <div className="proof-title">Deterministic math</div>
                <div className="proof-desc">
                  AI fetches data; code makes the decision. Reliable, explainable, auditable.
                </div>
              </div>
              <div className="proof-item">
                <div className="proof-icon">🔒</div>
                <div className="proof-title">No account needed</div>
                <div className="proof-desc">
                  Cards saved in your browser. Nothing shared. Start in 30 seconds.
                </div>
              </div>
            </div>

            <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", textAlign: "center" }}>
              Powered by Azure OpenAI · Tavily · Supabase · Three.js
            </p>
          </div>
        )}

        {/* ── Cards ── */}
        {screen === "cards" && (
          <ScreenCards
            cards={cards}
            onCardsChange={setCards}
            onContinue={() => setScreen("trip")}
          />
        )}

        {/* ── Trip ── */}
        {screen === "trip" && (
          <ScreenTrip
            cards={cards}
            onContinue={handleTripSubmit}
            onBack={() => setScreen("cards")}
          />
        )}

        {/* ── Results ── */}
        {screen === "results" && intent && (
          <ScreenResults
            cards={cards}
            intent={intent}
            recommendations={recommendations}
            onStartOver={handleStartOver}
            onBack={() => setScreen("trip")}
          />
        )}
      </main>
    </div>
  );
}
