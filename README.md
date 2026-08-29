# PointsPilot

A credit card rewards assistant that answers two questions: which card to use for a given
purchase, and which card to put a trip on. It searches the live web for current reward rates,
has Azure OpenAI turn those search results into structured card data, and then ranks the
options with plain deterministic scoring.

Built at the GitHub Copilot x Azure hackathon during NYC Tech Week, June 2026, in a roughly
three hour build window.

This was one of two implementations the team built in parallel, the plan being to submit
whichever was ready first against the deadline. A teammate's version finished first and was the
one submitted; it is at [pointspilot](https://github.com/raunak-choudhary/pointspilot) and
credits the full team. This repository is the implementation I built.

## The problem it works around

Ask a language model what an Amex Gold earns on dining and it will answer confidently and
often wrongly, because reward rates change and the model is recalling training data rather
than checking. PointsPilot never lets the model be the source of truth for a rate, and never
lets it pick the winner.

```
user types "Amex Gold"
   -> Tavily searches the live web for that card's current rates
   -> Azure OpenAI reads those search results and returns structured JSON
   -> the result is cached in Supabase for 30 days
   -> src/lib/recommend.ts ranks the wallet with ordinary arithmetic
```

The model does extraction. The ranking is deterministic TypeScript, so the same wallet and the
same category always produce the same answer, and the reasoning can be shown to the user
rather than hidden inside a prompt.

## What it does

- **Card lookup.** Type a card name and get its earn multipliers by category, point value in
  cents per point, and issuer, assembled from live search results rather than model memory.
- **Wallet.** Add the cards you hold along with current point balances, persisted per device
  through Supabase.
- **Purchase recommendation.** Pick a spending category and see the full ranked field of your
  cards by effective value, not just a single winner.
- **Trip planning.** Describe a trip in plain language, let the model classify the intent, then
  choose whether to optimise for earning points or for redeeming an existing balance. The
  recommendation splits those into separate lanes so the trade-off is visible.
- **Booking links.** Each recommendation carries a deep link into the relevant card portal,
  with a category fallback when no portal applies.
- **3D card visualisation.** A Three.js scene renders the recommended cards with a spotlight
  and an entrance animation.

## Repository layout

```
src/
  app/
    api/ai/route.ts     server route: Tavily search, Azure OpenAI extraction, Supabase cache
    page.tsx            state machine across landing, cards, trip and results screens
    layout.tsx
    globals.css         dark-first design system
  components/
    ScreenCards.tsx     wallet building and live card lookup
    ScreenTrip.tsx      trip intent, priority selection, prompt chips
    ScreenResults.tsx   ranked recommendations and winner banner
    CardScene.tsx       Three.js card rendering
  lib/
    ai.ts               client wrappers for classify, card lookup and recommendation
    recommend.ts        deterministic ranking, no model involvement
    supabase.ts         profile persistence with a device scoped identifier
  types/index.ts        Card, TripIntent, Recommendation, Profile
supabase/schema.sql     profiles and card_cache tables
```

The API key never reaches the browser. All model and search calls go through the server route
in `src/app/api/ai/route.ts`.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router |
| Language | TypeScript 5 |
| UI | React 19 |
| Model | Azure OpenAI, gpt-4o-mini deployment |
| Live search | Tavily |
| Storage | Supabase, PostgreSQL |
| 3D | Three.js |
| Hosting | Vercel |

## Running it

Requires Node 20 or newer, plus Azure OpenAI, Tavily and Supabase credentials.

```bash
git clone https://github.com/raunak-choudhary/pointspilot-azure.git
cd pointspilot-azure
npm install
cp .env.local.example .env.local     # fill in your own values
```

Apply `supabase/schema.sql` in the Supabase SQL editor to create the `profiles` and
`card_cache` tables.

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Author

Raunak Choudhary

NYU MS Computer Science, Class of 2026

raunakchoudhary17@gmail.com
