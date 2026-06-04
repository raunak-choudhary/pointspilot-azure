import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ai = new OpenAI({
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/v1/`,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  defaultQuery: { "api-version": "preview" },
});
const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";

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
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: true,
    }),
  });
  if (!r.ok) throw new Error(`Tavily ${r.status}`);
  return r.json() as Promise<{
    answer?: string;
    results: { title: string; url: string; content: string }[];
  }>;
}

async function classify(text: string) {
  const c = await ai.chat.completions.create({
    model: DEPLOYMENT,
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Classify this purchase or travel intent into one category and write a 4-6 word summary.
Categories: travel, groceries, dining, streaming, gas, online, other.
Message: "${text}"
Respond ONLY as JSON: {"category":"...","summary":"..."}`,
      },
    ],
  });
  return JSON.parse(c.choices[0]?.message?.content || "{}");
}

async function cardLookup(query: string) {
  const k = keyOf(query);

  // cache hit
  if (supa) {
    const { data } = await supa
      .from("card_cache")
      .select("*")
      .eq("key", k)
      .maybeSingle();
    if (data) {
      const ageDays =
        (Date.now() - new Date(data.fetched_at).getTime()) / 86400000;
      if (ageDays < CACHE_DAYS) return { ...data.payload, cached: true };
    }
  }

  // live search
  const year = new Date().getFullYear();
  const search = await webSearch(
    `${query} credit card rewards rates earning categories ${year}`,
  );
  const context = (search.results || [])
    .map((r) => `SOURCE: ${r.title} (${r.url})\n${r.content}`)
    .join("\n\n---\n\n");
  const sources = (search.results || [])
    .slice(0, 4)
    .map((r) => ({ title: r.title, url: r.url }));

  // extract structured data from search results
  const c = await ai.chat.completions.create({
    model: DEPLOYMENT,
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Using ONLY the web results below, extract current reward multipliers for the card named. If a category isn't stated, use 1. Do not invent rates.
CARD: "${query}"
WEB RESULTS:
${context || "(no results found)"}

Respond ONLY as JSON:
{"name":"","issuer":"","currency":"","cpp":1.0,"rewards":{"dining":0,"travel":0,"streaming":0,"groceries":0,"gas":0,"online":0,"other":0},"note":"one short line"}`,
      },
    ],
  });

  const payload = {
    ...JSON.parse(c.choices[0]?.message?.content || "{}"),
    sources,
    asOf: new Date().toISOString().slice(0, 10),
  };

  // cache it
  if (supa) {
    await supa
      .from("card_cache")
      .upsert({ key: k, payload, fetched_at: new Date().toISOString() });
  }

  return payload;
}

export async function POST(req: NextRequest) {
  try {
    const { mode, text } = await req.json();
    if (mode === "classify") return NextResponse.json(await classify(text));
    if (mode === "cardLookup") return NextResponse.json(await cardLookup(text));
    return NextResponse.json(
      { error: "mode must be classify or cardLookup" },
      { status: 400 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
