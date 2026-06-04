# PointsPilot — Project Brain

## One-Line Pitch
AI-powered credit card rewards optimizer: describe your purchase, get the best card in seconds — powered by live web data, not stale presets.

## The Problem (June 2026 Context)
Americans hold an average of 4 credit cards but use the wrong one 73% of the time, leaving $12 billion in rewards unclaimed annually. With card issuers constantly updating bonus categories, transfer partners, and CPP rates, no single person can track the optimal choice manually. PointsPilot solves this by fetching live reward data from the web at lookup time — the AI never invents rates, it extracts them from real search results.

## Core Insight That Makes This Defensible
**AI as extractor, not oracle.** Azure OpenAI doesn't memorize reward rates (which change). Instead:
```
User types "Amex Gold"
  → Tavily searches the live web for current rates
  → Azure OpenAI extracts structured JSON FROM those results
  → Cached in Supabase for 30 days (with source URLs + asOf date)
```
Recommendation math is deterministic TypeScript — never probabilistic. This matters to judges.

---

## Architecture

```
pointspilot/
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── route.ts          ← Azure OpenAI + Tavily server endpoint
│   ├── globals.css               ← CSS custom properties, dark + light theme
│   ├── layout.tsx                ← Root layout
│   └── page.tsx                  ← Full single-page app (all 4 screens)
├── lib/
│   ├── ai.ts                     ← Client-side AI wrapper (classify + cardLookup)
│   ├── recommend.ts              ← Deterministic scoring (bestForCategory, bestForTrip)
│   └── supabase.ts               ← Profile persistence + device ID
├── components/
│   ├── CardScene.tsx             ← Three.js 3D card visualization (results screen)
│   ├── ScreenCards.tsx           ← Card setup screen
│   ├── ScreenTrip.tsx            ← Trip input + priority selection
│   ├── ScreenConfirm.tsx         ← Confirm parsed intent
│   └── ScreenResults.tsx         ← Recommendation lanes + 3D scene
├── types/
│   └── index.ts                  ← Shared TypeScript types
├── supabase/
│   └── schema.sql                ← Run once in Supabase SQL editor
├── docs/
│   └── COPILOT_USAGE.md          ← GitHub Copilot build log (25 hackathon points)
│   └── plans/
│       └── implementation-plan.md
├── .env.local                    ← NEVER commit — real keys go here
├── .env.local.example            ← Committed — empty values only
└── CLAUDE.md                     ← This file
```

## Data Flow

```
[User types card name]
      ↓
[lib/ai.ts: aiCardLookup()]
      ↓
[POST /api/ai  mode=cardLookup]
      ↓
[Supabase card_cache: cache hit? → return]
      ↓ (cache miss)
[Tavily: web search for current reward rates]
      ↓
[Azure OpenAI gpt-4o-mini: extract JSON from search results]
      ↓
[Supabase card_cache: store with asOf date + source URLs]
      ↓
[lib/recommend.ts: deterministic scoring → best card]
      ↓
[ScreenResults: Three.js 3D animation + lane cards]
```

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router, TypeScript) | Server routes keep API keys server-side |
| AI | Azure OpenAI gpt-4o-mini | Azure bonus points, grounded extraction |
| Live data | Tavily search API | Current reward rates, not stale training data |
| Database | Supabase (Postgres) | Profile persistence + 30-day card cache |
| 3D viz | Three.js (via npm) | Judge-stopping visual on results screen |
| Hosting | Vercel | Free tier, instant deploy from GitHub |
| CSS | CSS custom properties | Dark/light theme, no Tailwind dependency |

## Algorithms (Judge-Defensible)

1. **Weighted multi-criteria scoring** (`bestForCategory`, `bestForTrip`) — rates × CPP with priority-adjusted weights. Named: MCDM (Multi-Criteria Decision Making).
2. **Greedy cache-then-fetch** — O(1) Supabase lookup before any Tavily call. Cache key is normalized card name (lowercase, alphanumeric). 30-day TTL.
3. **Keyword fallback classifier** — local regex over 6 category keyword lists, O(n·k), used when AI endpoint is unavailable.

## Supabase Schema
```sql
-- Run in Supabase SQL editor (supabase/schema.sql)
create table if not exists profiles (
  device      text primary key,
  data        jsonb not null,
  updated_at  timestamptz default now()
);

create table if not exists card_cache (
  key         text primary key,
  payload     jsonb not null,
  fetched_at  timestamptz default now()
);

alter table profiles   disable row level security;
alter table card_cache disable row level security;
```

## Environment Variables (all in .env.local — never commit)
```
AZURE_OPENAI_ENDPOINT       Azure resource endpoint URL
AZURE_OPENAI_API_KEY        Azure OpenAI key
AZURE_OPENAI_DEPLOYMENT     Model deployment name (gpt-4o-mini)
TAVILY_API_KEY              Tavily search key (tavily.com)
NEXT_PUBLIC_SUPABASE_URL    Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  Supabase anon key (public, safe)
SUPABASE_URL                Supabase project URL (server-side)
SUPABASE_SERVICE_KEY        Supabase service role key (NEVER expose to client)
```

## Phase Exit Conditions
- **Phase 0 done**: `npm run dev` starts, env loads, Supabase schema applied
- **Phase 1 done**: `/api/ai` returns structured JSON for both classify and cardLookup; Supabase cache verified
- **Phase 2 done**: All 4 screens render, flow works end-to-end with real AI, profile persists on refresh
- **Phase 3 done**: Three.js scene visible on results, deployed to Vercel, live URL works

## Demo Script (Judge-Facing, 90 Seconds)
1. Open live Vercel URL
2. "Americans leave $12 billion in rewards unclaimed every year."
3. Click **Add card** → type "Chase Sapphire Reserve" → watch AI fetch live rates → source URLs appear
4. Type trip: "NYC to LA next weekend, I want to maximize points"
5. Confirm screen → Get recommendations
6. Results: Three.js 3D cards animate in, spotlight on winner
7. Click **Book this way** → real booking URL
8. "Live reward data, AI-extracted. Deployed on Azure OpenAI. Built with GitHub Copilot."

## Hackathon Scoring Notes
- Working MVP: 25pts — demo must run end-to-end on live Vercel URL
- GitHub Copilot: 25pts — document in docs/COPILOT_USAGE.md before submission
- Product value: 20pts — real problem, live data, grounded AI
- Design & UX: 15pts — 3D Three.js visualization, dark/light theme, clean flow
- Technical soundness: 10pts — named algorithms, server-side keys, Supabase cache
- Prize impact: 5pts — "$25K Azure credits unlocks real-time card API partnerships and RLS auth"
- Azure bonus: +5pts — Azure OpenAI is the AI backbone

## Non-Negotiable Rules
1. All secrets in .env.local only — never in code or comments
2. SUPABASE_SERVICE_KEY server-side only — never in client bundle
3. Azure OpenAI key server-side only — route.ts, never lib/ai.ts
4. Dark and light theme from first component via CSS custom properties
5. Responsive at 375px, 768px, 1280px
6. `npm run build` must pass before any deploy
