import type { Card } from "@/types";

const COLORS = ["#1A4B8C", "#B79A5C", "#9E2B25", "#1A1A2E", "#2B3A55", "#3D8168", "#6c63ff", "#d4af37"];
const hashColor = (s: string): string =>
  COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

const KW: Record<string, string[]> = {
  travel: ["trip", "fly", "flight", "travel", "vacation", "hotel", "weekend", "getaway", "airport"],
  groceries: ["grocery", "groceries", "instacart", "supermarket", "produce", "trader joe", "whole foods"],
  dining: ["dinner", "lunch", "restaurant", "dining", "reservation", "brunch", "cafe", "coffee"],
  streaming: ["streaming", "netflix", "spotify", "subscription", "disney", "hulu", "apple tv"],
  gas: ["gas", "fuel", "fill up", "petrol", "bp", "shell", "exxon"],
  online: ["amazon", "online", "shopping", "walmart", "target", "ebay", "etsy"],
};

const kwClass = (t: string): string => {
  t = t.toLowerCase();
  for (const [c, w] of Object.entries(KW)) {
    if (w.some((x) => t.includes(x))) return c;
  }
  return "travel";
};

async function call(mode: string, text: string): Promise<Record<string, unknown>> {
  const r = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, text }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
}

export async function aiClassify(text: string): Promise<{ category: string; summary: string }> {
  try {
    const result = await call("classify", text);
    return result as { category: string; summary: string };
  } catch {
    return { category: kwClass(text), summary: text.slice(0, 40) };
  }
}

export function normalize(obj: Record<string, unknown>): Card {
  const name = (obj.name as string) || "Unknown Card";
  return {
    id: `${name}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    issuer: (obj.issuer as string) || "Unknown",
    cur: (obj.currency as string) || (obj.cur as string) || "Points",
    cpp: (obj.cpp as number) || 1,
    color: hashColor(name),
    points: 0,
    r: {
      dining: 1, travel: 1, streaming: 1, groceries: 1, gas: 1, online: 1, other: 1,
      ...((obj.rewards as Record<string, number>) || (obj.r as Record<string, number>) || {}),
    },
    note: (obj.note as string) || "",
    sources: (obj.sources as Card["sources"]) || [],
    asOf: (obj.asOf as string) || null,
  };
}

// Seeded fallback cards used when the AI endpoint isn't configured
const SEED_CARDS: Record<string, Omit<Card, "id" | "color" | "points">> = {
  "chase sapphire reserve": {
    name: "Chase Sapphire Reserve", issuer: "Chase", cur: "Ultimate Rewards", cpp: 1.5,
    r: { dining: 3, travel: 10, streaming: 1, groceries: 1, gas: 1, online: 1, other: 1 },
    note: "Best for travel + dining — 10x via Chase Travel portal", sources: [], asOf: "seeded",
  },
  "amex gold": {
    name: "American Express Gold", issuer: "American Express", cur: "Membership Rewards", cpp: 1.0,
    r: { dining: 4, travel: 3, streaming: 1, groceries: 4, gas: 1, online: 1, other: 1 },
    note: "Best for dining + groceries", sources: [], asOf: "seeded",
  },
  "amex platinum": {
    name: "American Express Platinum", issuer: "American Express", cur: "Membership Rewards", cpp: 1.0,
    r: { dining: 1, travel: 5, streaming: 1, groceries: 1, gas: 1, online: 1, other: 1 },
    note: "Best for travel + lounge access", sources: [], asOf: "seeded",
  },
  "capital one venture x": {
    name: "Capital One Venture X", issuer: "Capital One", cur: "Miles", cpp: 1.0,
    r: { dining: 2, travel: 10, streaming: 1, groceries: 1, gas: 1, online: 1, other: 1 },
    note: "Flexible travel redemptions", sources: [], asOf: "seeded",
  },
  "chase freedom unlimited": {
    name: "Chase Freedom Unlimited", issuer: "Chase", cur: "Cash Back", cpp: 1.0,
    r: { dining: 3, travel: 5, streaming: 1, groceries: 1, gas: 1, online: 1, other: 1.5 },
    note: "Great everyday card with 1.5x everywhere", sources: [], asOf: "seeded",
  },
};

function seedFallback(query: string): Card {
  const key = query.toLowerCase().trim();
  const found = Object.entries(SEED_CARDS).find(([k]) => key.includes(k) || k.includes(key));
  if (found) {
    return normalize({ ...found[1] });
  }
  return normalize({ name: query, issuer: "Card", currency: "Points", cpp: 1, rewards: {}, note: "Add this card and set your earn rates" });
}

export async function aiCardLookup(query: string): Promise<Card> {
  try {
    const result = await call("cardLookup", query);
    const card = normalize(result);
    // If the AI returned all-1 rates, it likely failed silently — try seed
    const allOnes = Object.values(card.r).every((v) => v === 1);
    if (allOnes) return seedFallback(query);
    return card;
  } catch {
    return seedFallback(query);
  }
}
