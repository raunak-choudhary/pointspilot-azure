import type { Card, Recommendation } from "@/types";

export const rateFor = (c: Card, cat: string): number => c.r[cat] ?? 1;

export function bestForCategory(cards: Card[], cat: string): (Card & { rate: number; value: number })[] {
  return [...cards]
    .map((c) => ({ ...c, rate: rateFor(c, cat), value: rateFor(c, cat) * c.cpp }))
    .sort((a, b) => b.value - a.value);
}

export function bestForTrip(cards: Card[], priority: string): Recommendation[] {
  if (cards.length === 0) return [];

  const byEarn = [...cards]
    .map((c) => ({ ...c, score: rateFor(c, "travel") * c.cpp }))
    .sort((a, b) => b.score - a.score);

  const byBalance = [...cards].sort((a, b) => b.points - a.points);
  const hasBalance = (byBalance[0]?.points ?? 0) > 0;

  const rackUp = byEarn[0];
  const redeem = hasBalance ? byBalance[0] : byEarn[0];
  const overall = hasBalance ? byBalance[0] : byEarn[0];

  return [
    {
      title: "Best Overall",
      badge: "Most practical path",
      card: overall,
      why: hasBalance
        ? `Lowest out-of-pocket: lean on ${overall.points.toLocaleString()} points, then this card for the rest.`
        : `Best travel-value card to offset cost (${rateFor(overall, "travel")}x travel earn rate).`,
      rate: rateFor(overall, "travel"),
      pointsEarned: 0,
      pointsSpent: hasBalance ? Math.min(overall.points, 30000) : 0,
    },
    {
      title: "Best Earnings",
      badge: "Rack up for next trip",
      card: rackUp,
      why: `Highest travel earn rate — pay cash and bank ${rateFor(rackUp, "travel")}x points per dollar for later.`,
      rate: rateFor(rackUp, "travel"),
      pointsEarned: Math.round(450 * rateFor(rackUp, "travel")),
      pointsSpent: 0,
    },
    {
      title: "Best Redemption",
      badge: "Burn points now",
      card: redeem,
      why: hasBalance
        ? `Most points on hand (${redeem.points.toLocaleString()}). Redeem to cover the fare directly.`
        : `Best transfer card to redeem from — ${redeem.cpp.toFixed(2)} cpp estimated value.`,
      rate: rateFor(redeem, "travel"),
      pointsEarned: 0,
      pointsSpent: hasBalance ? Math.min(redeem.points, 50000) : 0,
    },
  ];
}

export function bestForPurchase(cards: Card[], category: string): Recommendation[] {
  if (cards.length === 0) return [];
  const ranked = bestForCategory(cards, category);
  const top = ranked[0];
  const second = ranked[1];

  const results: Recommendation[] = [
    {
      title: "Best Card",
      badge: "Top pick",
      card: top,
      why: `${top.rate}x ${category} earn rate × ${top.cpp.toFixed(2)} cpp = ${(top.rate * top.cpp).toFixed(2)} cents per dollar — highest value here.`,
      rate: top.rate,
      pointsEarned: Math.round(50 * top.rate),
      pointsSpent: 0,
    },
  ];

  if (second && second.id !== top.id) {
    results.push({
      title: "Runner Up",
      badge: "Strong alternative",
      card: second,
      why: `${second.rate}x ${category} earn rate. Solid choice if you're building toward a specific redemption goal with ${second.cur}.`,
      rate: second.rate,
      pointsEarned: Math.round(50 * second.rate),
      pointsSpent: 0,
    });
  }

  return results;
}
