import { AzureOpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";

const ai = new AzureOpenAI({
  endpoint: (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/$/, ""),
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  apiVersion: "2024-10-21",
  deployment: DEPLOYMENT,
});

const supa =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

const CACHE_DAYS = 30;
const keyOf = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);

async function webSearch(query: string) {
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({ query, search_depth: "basic", max_results: 5, include_answer: true }),
  });
  if (!r.ok) throw new Error(`Tavily ${r.status}`);
  return r.json() as Promise<{ answer?: string; results: { title: string; url: string; content: string }[] }>;
}

async function classify(text: string) {
  const c = await ai.chat.completions.create({
    model: DEPLOYMENT,
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `Classify this purchase or travel intent into one category and write a 4-6 word summary.
Categories: travel, groceries, dining, streaming, gas, online, other.
Message: "${text}"
Respond ONLY as JSON: {"category":"...","summary":"..."}`,
    }],
  });
  return JSON.parse(c.choices[0]?.message?.content || "{}");
}

async function cardLookup(query: string) {
  const k = keyOf(query);
  if (supa) {
    const { data } = await supa.from("card_cache").select("*").eq("key", k).maybeSingle();
    if (data) {
      const ageDays = (Date.now() - new Date(data.fetched_at).getTime()) / 86400000;
      if (ageDays < CACHE_DAYS) return { ...data.payload, cached: true };
    }
  }
  const year = new Date().getFullYear();
  const search = await webSearch(`${query} credit card rewards rates earning categories ${year}`);
  const context = (search.results || []).map((r) => `SOURCE: ${r.title} (${r.url})\n${r.content}`).join("\n\n---\n\n");
  const sources = (search.results || []).slice(0, 4).map((r) => ({ title: r.title, url: r.url }));
  const c = await ai.chat.completions.create({
    model: DEPLOYMENT,
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Using ONLY the web results below, extract current reward multipliers for the card named. If a category isn't stated, use 1. Do not invent rates.
CARD: "${query}"
WEB RESULTS:
${context || "(no results found)"}

Respond ONLY as JSON:
{"name":"","issuer":"","currency":"","cpp":1.0,"rewards":{"dining":0,"travel":0,"streaming":0,"groceries":0,"gas":0,"online":0,"other":0},"note":"one short line"}`,
    }],
  });
  const payload = { ...JSON.parse(c.choices[0]?.message?.content || "{}"), sources, asOf: new Date().toISOString().slice(0, 10) };
  if (supa) await supa.from("card_cache").upsert({ key: k, payload, fetched_at: new Date().toISOString() });
  return payload;
}

async function recommend(cards: { name: string; cur: string; points: number; r: Record<string, number>; cpp: number }[], intent: { text: string; category: string; priority: string }) {
  const cardContext = cards.map(c =>
    `- ${c.name}: ${c.points > 0 ? c.points.toLocaleString() + " " + c.cur + " available, " : ""}travel=${c.r.travel || 1}x, dining=${c.r.dining || 1}x, groceries=${c.r.groceries || 1}x, online=${c.r.online || 1}x, gas=${c.r.gas || 1}x, value=${c.cpp} cents/point`
  ).join("\n");

  const c = await ai.chat.completions.create({
    model: DEPLOYMENT,
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 900,
    messages: [{
      role: "user",
      content: `You are an expert credit card rewards advisor. The user has these cards:
${cardContext}

Their plan: "${intent.text}"
Spend category: ${intent.category}
What they care about: ${intent.priority}

Give exactly 3 specific, actionable recommendations for what they should do with their cards and points for this plan.
Be concrete — name the card, say exactly how many points to use or earn, give the dollar value.
Do NOT send them to external websites. Just tell them what action to take.

Respond ONLY as JSON:
{
  "recommendations": [
    {
      "badge": "BEST OVERALL",
      "title": "concise action title",
      "card": "exact card name from the list",
      "action": "specific thing to do — 1-2 sentences, very concrete",
      "points_impact": "e.g. +4,500 Ultimate Rewards earned OR -35,000 points redeemed",
      "dollar_value": "e.g. Worth ~$67 at 1.5 cpp",
      "why": "one sentence explaining why this fits their priority"
    },
    {
      "badge": "BEST EARNINGS",
      ...
    },
    {
      "badge": "BEST REDEMPTION",
      ...
    }
  ]
}`,
    }],
  });
  return JSON.parse(c.choices[0]?.message?.content || '{"recommendations":[]}');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body;
    if (mode === "classify") return NextResponse.json(await classify(body.text));
    if (mode === "cardLookup") return NextResponse.json(await cardLookup(body.text));
    if (mode === "recommend") return NextResponse.json(await recommend(body.cards, body.intent));
    return NextResponse.json({ error: "invalid mode" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
