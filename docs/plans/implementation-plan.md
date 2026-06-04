# PointsPilot — Implementation Plan

## What We're Building
A Next.js app where users add their credit cards (live AI-fetched reward rates), describe a purchase or trip, and get the best card recommendation in seconds. AI extracts real data from the web; TypeScript makes the decision.

---

## Phase 0 — Scaffold & Config (30 min)

**Goal:** `npm run dev` runs, env loads, Supabase schema applied.

### Steps
1. `npx create-next-app@latest . --ts --app --no-tailwind --eslint --src-dir=false`
2. `npm install openai @supabase/supabase-js three @types/three`
3. Copy `.env.local.example` → `.env.local`, fill in values
4. Create `supabase/schema.sql` (two tables: profiles, card_cache)
5. Run schema in Supabase SQL editor
6. Verify: `npm run dev` starts at localhost:3000

### Files Created
- `package.json` (auto-generated + 3 deps added)
- `next.config.ts`
- `supabase/schema.sql`
- `.env.local` (user fills — never committed)

### Exit Condition
`npm run dev` starts, no env errors, Supabase project has both tables.

---

## Phase 1 — Backend Layer (45 min)

**Goal:** `/api/ai` returns correct JSON for classify and cardLookup; Supabase cache works.

### Files to Create
```
lib/
  ai.ts          ← aiClassify(), aiCardLookup(), normalize(), hashColor()
  recommend.ts   ← bestForCategory(), bestForTrip(), rateFor()
  supabase.ts    ← supabase client, deviceId(), loadProfile(), saveProfile()
types/
  index.ts       ← Card, Profile, TripIntent, Recommendation types
app/api/ai/
  route.ts       ← POST handler: classify + cardLookup (Tavily → OpenAI → cache)
```

### Key Logic in route.ts
```
POST /api/ai
  body: { mode: "classify" | "cardLookup", text: string }

classify flow:
  Azure OpenAI → { category, summary }
  Fallback: local keyword matching

cardLookup flow:
  1. Check Supabase card_cache (key = normalized card name)
  2. Cache hit (< 30 days) → return immediately
  3. Cache miss → Tavily web search for current rates
  4. Azure OpenAI extracts structured JSON from search results
  5. Store in Supabase with asOf date + source URLs
  6. Return payload
```

### Milestone Check
```bash
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"mode":"classify","text":"I want to fly to Paris next week"}'
# Expected: {"category":"travel","summary":"Paris flight next week"}

curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"mode":"cardLookup","text":"Chase Sapphire Reserve"}'
# Expected: {"name":"Chase Sapphire Reserve","rewards":{...},"sources":[...],"asOf":"2026-..."}
```

### Exit Condition
Both curl tests return valid JSON. Supabase card_cache table gets a new row after cardLookup.

---

## Phase 2 — UI Screens (60 min)

**Goal:** All 4 screens work end-to-end; profile persists on refresh; AI wired in.

### Screens

**Screen 1 — Landing (`app/page.tsx` initial state)**
- Headline + one-sentence pitch
- "Start optimizing" CTA → goes to Cards screen
- "Try demo" CTA → preloads sample cards + trip
- Proof points: Compare cards · Live reward data · Click to book

**Screen 2 — Card Setup (`components/ScreenCards.tsx`)**
- Search input: user types any card name
- On submit: calls `aiCardLookup()` → shows card with live rates + source URLs + asOf date
- Shows earn rates per category (dining, travel, streaming, gas, groceries)
- Point balance input (optional, used for redemption math)
- "Continue" once ≥ 1 card added

**Screen 3 — Trip / Purchase Input (`components/ScreenTrip.tsx`)**
- Large text area: natural language purchase/trip description
- Priority selector: "Rack up points" / "Redeem for this trip" / "Spend the least cash"
- Prompt chips for quick demo: "NYC to LA weekend", "Dinner in NYC", "Amazon order"
- On submit: calls `aiClassify()` → shows detected category + summary
- "Continue to confirm"

**Screen 4 — Results (`components/ScreenResults.tsx`)**
- `CardScene.tsx` — Three.js 3D visualization at the top
  - 3 rotating card meshes with gradient materials
  - Spotlight + glow effect on the winner
  - Animated entrance (cards fly in from below)
- Below 3D scene: recommendation lanes (Best Overall, Best Earnings, Best Redemption)
- Each lane: card name, channel, points earned/spent, why, booking CTA
- Source attribution: "Rates fetched from web · asOf [date]"
- "Start over" returns to landing with cards preserved

### Component Structure
```
app/page.tsx          ← State machine: landing | cards | trip | results
                         Holds: cards[], trip, recommendations
                         Passes props down to each screen component

components/
  ScreenCards.tsx     ← Card lookup + wallet management
  ScreenTrip.tsx      ← Trip input + classify
  ScreenResults.tsx   ← Lanes + CardScene
  CardScene.tsx       ← Three.js (dynamic import, no SSR)
```

### Styling Approach
- `app/globals.css` — CSS custom properties for all colors:
  ```css
  :root {
    --bg: #0a0a0f;              /* dark default */
    --surface: #13131a;
    --accent: #6c63ff;          /* purple — financial trust */
    --accent-glow: rgba(108,99,255,0.3);
    --text: #f0f0f5;
    --muted: #8888aa;
    --card-gold: #d4af37;
    --success: #22c55e;
  }
  ```
- Dark theme by default (matches judge's laptop aesthetic)
- Light theme toggle via `data-theme="light"` on `<html>`
- No Tailwind — pure CSS modules or globals

### Exit Condition
Full flow works: add card → type trip → see results with 3D scene. `loadProfile()` restores cards on page refresh.

---

## Phase 3 — Polish & Deploy (30 min)

**Goal:** Live URL on Vercel, `npm run build` passes, Copilot docs complete.

### Polish Checklist
- [ ] Loading states: spinner while AI fetches card data
- [ ] Error states: graceful fallback if Tavily or OpenAI fails
- [ ] Responsive: test at 375px, 768px, 1280px
- [ ] Dark/light theme toggle works
- [ ] Three.js canvas is responsive (resize observer)
- [ ] `npm run build` has zero errors

### Deploy Steps
```bash
# 1. Commit all files
git add -A && git commit -m "feat: initial PointsPilot build"
git push origin main

# 2. Vercel deploy
npx vercel --prod
# When prompted: set all env vars from .env.local

# 3. Verify live URL works end-to-end
```

### Copilot Documentation
Create `docs/COPILOT_USAGE.md` — list every phase where GitHub Copilot assisted:
- route.ts: Tavily integration pattern
- CardScene.tsx: Three.js card mesh geometry
- recommend.ts: scoring algorithm
- globals.css: CSS custom properties structure

### Fallback Plan
If Azure OpenAI or Tavily is down during demo:
- `aiCardLookup` falls back to a hardcoded 8-card seeded catalog
- `aiClassify` falls back to local keyword matching
- Demo mode: "Try demo" button preloads working sample data
- The app NEVER shows a blank results screen

### Exit Condition (3:15 PM)
- Live Vercel URL works end-to-end
- Demo script rehearsed once
- Copilot docs written
- Submission form filled

---

## requirements (package.json deps)
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "openai": "^4.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "three": "^0.170.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/three": "^0.170.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Azure OpenAI key not ready | Demo mode with seeded card data works immediately |
| Tavily rate limit | 30-day Supabase cache means repeat lookups never hit Tavily |
| Three.js SSR crash | Dynamic import with `{ ssr: false }` |
| Build fails on deploy | `npm run build` locally before any push |
| Demo internet goes down | All recommendation math is client-side deterministic |
