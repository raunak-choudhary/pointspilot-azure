export type Card = {
  id: string;
  name: string;
  issuer: string;
  cur: string;
  cpp: number;
  color: string;
  points: number;
  r: Record<string, number>;
  note: string;
  sources: { title: string; url: string }[];
  asOf: string | null;
};

export type TripIntent = {
  text: string;
  category: string;
  summary: string;
  priority: string;
};

export type Recommendation = {
  title: string;
  badge: string;
  card: Card;
  why: string;
  rate: number;
  pointsEarned: number;
  pointsSpent: number;
};

export type Profile = {
  cards: Card[];
  uses: number;
};
