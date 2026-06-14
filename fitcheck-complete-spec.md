# Fitcheck — The Complete Guide (Portfolio MVP → Global Consumer Product)

> **One-liner:** Your closet, digitized. Upload your wardrobe once, get AI-styled outfits every day — matched to occasion, weather, and your personal aesthetic — then grow it into a social, monetized consumer product for Europe and beyond.
>
> *This is the full standalone guide: it merges the base spec and the global spec into one document. Read top to bottom — it's ordered the way you'd actually build it.*

---

## 1. Problem, Vision & Market

**Problem:** People who care about style waste time every morning deciding what to wear, forget what they own, buy duplicates, and have no idea which combos work. Style knowledge (color theory, formality matching, proportions) exists but isn't applied to *your actual closet*.

**Vision:** A digital twin of your wardrobe. The app knows every knit and every pair of loafers, and acts like a personal stylist: "12°C and raining in Rapperswil, you have a presentation today → here are 3 outfits from clothes you already own — and here's *why* they work."

**Market:** Digital wardrobe apps are a proven, funded category — Whering (5M+ users), Acloset, Indyx, Combyne. Tailwinds: TikTok/IG fit-check culture + anti-fast-fashion sentiment (wear what you own, capsule wardrobes).

**Differentiation (don't be "another Whering"):**
1. **AI reasoning, not just collages** — competitors show grids; Fitcheck explains *why* an outfit works. Position: "the stylist that teaches you style"
2. **Men's style first** — every competitor is women-first; men's smart-casual/preppy is underserved, highly active on TikTok, and you ARE the target user
3. **Weather + calendar native** — outfits for your actual day, not abstract moodboards

**Honest framing:** consumer = highest ceiling, hardest game. Success is 50% product, 50% content distribution. The roadmap below is staged so the portfolio value is banked early (Phase 1) before the market bet (Phases 2–4).

---

## 2. Target Users

- **Core wedge:** men 16–30 building a style (smart casual / old money / streetwear)
- **Expansion:** women's market (10x bigger, brutal competition — enter only with traction)
- **Geo:** launch EN + DE simultaneously — you can produce native content for both markets, most competitors can't
- **User zero:** you. Your wardrobe is the test dataset, your daily use is the feedback loop

---

## 3. Feature Breakdown — Four Phases

### Phase 1 — Core MVP (weeks 1–6): the single-player magic

| Feature | Description |
|---|---|
| **Auth & profiles** | Clerk (Apple/Google social login — mandatory for consumer); style quiz onboarding (5 questions: aesthetic, fit preference, color palette, formality range, no-gos) |
| **Wardrobe upload** | Take/upload photo → client-side background removal → AI auto-tagging → editable confirm screen |
| **AI item tagging** | Vision model extracts: category, subcategory (oxford shirt, chinos, penny loafers...), colors, formality 1–5, seasons, pattern, material |
| **Closet view** | Image grid, filters by category/color/formality, item detail with manual tag editing |
| **Outfit generator** | Inputs: occasion (casual/smart casual/formal/sport) + auto-fetched weather → 3 outfit cards, each with one-sentence AI reasoning ("the camel knit warms up the grey trousers and picks up your loafers") |
| **Outfit saving & wear log** | Save outfits, favorites, "worn today" |
| **Weather native** | Open-Meteo forecast drives layer logic (outerwear below 15°C, rain → no suede) |

### Phase 2 — Consumer polish (weeks 7–9): activation & shareability

| Feature | Why |
|---|---|
| **5-minute magic onboarding** | Scan 5 items → instantly get 3 outfits. Gate NOTHING before this moment; batch capture mode (shoot 10 items in a row) |
| **Share cards** | Every outfit + Style DNA exports as a branded image (flat-lay collage + reasoning) sized for IG Stories/TikTok — the growth loop: every share is an ad |
| **OOTD calendar** | Snap daily fit → streaks → habit loop; calendar view avoids repeating outfits same week |
| **Style DNA** | After 20 items + 10 outfits: "Your style: 70% smart casual · palette navy/cream/brown · archetype: Modern Preppy" — screenshot-bait, shareable |
| **PWA install flow** | Home-screen app + push notification ("tomorrow: 8°C, rain — plan your fit tonight?") |

### Phase 3 — Monetization (weeks 11–13)

- **Pro subscription (€4–6/Mt):** unlimited AI outfits (free = 3/day), packing mode, advanced stats. Stripe on web (dodge the 30% app-store cut as long as possible)
- **Wear analytics:** cost-per-wear, most/least worn, "not worn in 60 days"
- **Gap analysis + affiliate:** "a camel overcoat unlocks 14 new outfits" → curated picks via affiliate networks (AWIN, Zalando Partner, Amazon) — monetization aligned with *buy less, buy right*
- **Packing mode:** "Milan, 3 days, business casual" → capsule list from your closet (Pro)

### Phase 4 — Social & scale (weeks 14+)

- **Social layer:** follow friends, fit-check feed, 🔥/❄️ voting on "should I wear this?" posts
- **Capsule challenges:** "30 outfits from 15 items" community challenges — UGC engine
- **Similarity search:** "find items that go with this" via CLIP embeddings + pgvector
- **Resale nudge:** "not worn in 6 months → list it on Vinted" (Europe-native angle)
- **Native apps:** Capacitor wrap → App Store/Play (camera UX + push boost)
- **Try-on AI (flagship, revenue-funded):** generate image of *you* wearing the combo (fal.ai/Replicate try-on models)

---

## 4. Tech Stack (complete)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript**, PWA from day 1 | Server actions keep AI keys server-side; same codebase → Capacitor later, no rewrite |
| Styling | **Tailwind v4 + shadcn/ui + Framer Motion** | Fashion app must *look* premium — invest in a custom theme, card-flip and transition polish |
| Auth | **Clerk** (Apple/Google) | Webhook-sync users into DB |
| DB | **Supabase (Postgres + pgvector + Storage + Realtime)** | Items/outfits/social + vector similarity + image storage + live feed in one platform |
| Background removal | **@imgly/background-removal** (client-side, on-device) | Zero per-image cost — critical at consumer scale |
| Image handling | `<input capture>` + browser-image-compression client-side; **Cloudinary** or Vercel Image Opt as CDN | Closet grids are image-heavy; compress before upload, transform at edge |
| AI — tagging | **Claude Haiku / GPT-4o-mini vision** | Structured-JSON tagging at ~$0.002/item (one-time per item) |
| AI — reasoning | Same mini-tier model for outfit re-ranking (text-only call — cheap) | |
| Embeddings | **CLIP via Replicate** → **pgvector** | Similar-item search, style matching (Phase 4) |
| Weather | **Open-Meteo** | Free, no key, excellent for Europe |
| Share cards | **@vercel/og (satori)** | Server-rendered branded outfit images |
| State/data | **TanStack Query** (server data, optimistic updates) + **Zustand** (generator flow) | |
| Payments | **Stripe** (web) → RevenueCat when native | |
| Affiliate | AWIN / Zalando Partner / Amazon PA-API | Phase 3 |
| Push | web-push (PWA) → OneSignal (native) | Daily outfit reminder = retention lever |
| i18n | **next-intl — EN + DE at launch** | Two content markets you can serve natively |
| Analytics | **PostHog** (funnels, retention cohorts, K-factor) + TikTok/Meta pixels later | Consumer = you live in retention dashboards |
| Deployment | **Vercel** | |

---

## 5. Database Schema (complete)

```sql
-- ============ CORE (Phase 1-2) ============

create table profiles (
  id uuid primary key,
  clerk_id text unique not null,
  display_name text,
  handle text unique,                      -- for social later
  style_aesthetic text[],                  -- ['smart_casual','preppy']
  color_palette text[],
  formality_min int default 1,
  formality_max int default 5,
  location_lat double precision,
  location_lon double precision,
  locale text default 'en',
  style_dna jsonb,                         -- computed archetype/palette/stats (Phase 2)
  ootd_streak int default 0,
  created_at timestamptz default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  image_url text not null,                 -- original
  cutout_url text,                         -- bg-removed
  category text not null,                  -- top | bottom | shoes | outerwear | accessory
  subcategory text,                        -- 'oxford_shirt', 'chinos', 'penny_loafers'
  colors text[] not null,
  pattern text,                            -- solid | striped | check | print
  material text,
  formality int check (formality between 1 and 5),
  seasons text[],
  brand text,
  price numeric,                           -- enables cost-per-wear
  embedding vector(512),                   -- CLIP (Phase 4)
  archived boolean default false,
  created_at timestamptz default now()
);

create table outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text,
  occasion text,                           -- casual | smart_casual | formal | sport
  weather_snapshot jsonb,                  -- temp/condition at generation
  ai_reasoning text,                       -- the "why it works" sentence
  is_favorite boolean default false,
  created_at timestamptz default now()
);

create table outfit_items (
  outfit_id uuid references outfits(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  slot text not null,                      -- top | bottom | shoes | outer | accessory
  primary key (outfit_id, item_id)
);

create table wear_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  outfit_id uuid references outfits(id),
  worn_on date not null,
  occasion text,
  photo_url text,                          -- OOTD snap (Phase 2)
  created_at timestamptz default now()
);

-- ============ MONETIZATION (Phase 3) ============

create table subscriptions (
  user_id uuid primary key references profiles(id),
  stripe_customer_id text,
  plan text default 'free',                -- free | pro
  status text,
  current_period_end timestamptz
);

create table usage_counters (               -- free-tier limits (3 generations/day)
  user_id uuid references profiles(id) on delete cascade,
  day date not null,
  generations int default 0,
  primary key (user_id, day)
);

create table affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  product_ref text,                        -- network + product id
  source text,                             -- 'gap_analysis' | 'similar_items'
  clicked_at timestamptz default now()
);

-- ============ SOCIAL (Phase 4) ============

create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  followee_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followee_id)
);

create table posts (                        -- fit checks
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  outfit_id uuid references outfits(id),
  image_url text not null,
  caption text,
  visibility text default 'followers',     -- public | followers | private
  created_at timestamptz default now()
);

create table votes (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  value text not null,                     -- fire | ice
  primary key (post_id, user_id)
);

-- RLS everywhere: user_id = auth.uid(); posts readable per visibility +
-- follows; keep policies FLAT (no recursion — RappiTours lesson)
```

---

## 6. AI Tagging Pipeline (per item upload)

1. User shoots photo → client-side compression → **on-device background removal** → upload original + cutout to Supabase Storage
2. Server action sends cutout to the vision model with a strict prompt:

```
You are a fashion catalog tagger. Analyze the clothing item and respond ONLY
with JSON matching this schema:
{
  "category": "top|bottom|shoes|outerwear|accessory",
  "subcategory": "string (e.g. oxford_shirt, chinos, penny_loafers)",
  "colors": ["dominant", "secondary"],
  "pattern": "solid|striped|check|print|other",
  "material": "best guess",
  "formality": 1-5,
  "seasons": ["spring","summer","autumn","winter"]
}
```

3. Parse → insert into `items` → **confirm screen** (AI is ~90% right; user fixes the rest — never trust blindly)
4. (Phase 4) async job computes CLIP embedding → `items.embedding`

**Cost engineering:** bg removal free (on-device), tagging ~$0.002/item one-time. A 100-item closet costs cents; 100k users stays sane. The cost discipline is what makes the free tier sustainable.

---

## 7. Outfit Generation Algorithm (the core)

Hybrid: **rules filter → scoring → AI re-ranks.** Deterministic where possible, LLM only where taste matters.

**Step 1 — Hard filters (SQL):**
- Slots: top + bottom + shoes (+ outerwear if temp < 15°C; exclude suede/canvas if rain)
- `formality` within occasion band (smart casual = 2.5–4)
- Season matches; exclude items worn in last N days (from `wear_logs`)

**Step 2 — Combination scoring (TypeScript, ~20 candidates):**
- **Color harmony:** rule table — neutrals (navy/grey/beige/white/brown) pair with anything; accent+accent penalized unless analogous; max one pattern per outfit
- **Formality coherence:** variance across pieces penalized (no formality-5 shoes with formality-1 shorts)
- **Style DNA affinity:** boost combos matching user's aesthetic tags

**Step 3 — AI re-ranking (ONE cheap text call):**
- Send top 20 combos *as tag descriptions* (never images — 50x cheaper) + aesthetic + occasion + weather
- Returns top 3, each with a one-sentence reasoning → stored in `ai_reasoning` and shown on the card

The visible reasoning is simultaneously the differentiation, the trust-builder, and the share-card content. Protect its quality.

---

## 8. Pages / Routes

```
/                       → landing (dark, premium, demo video)
/onboarding             → style quiz → guided first-5-items capture → first outfits (the magic moment)
/closet                 → grid, filters, batch-upload FAB
/closet/[itemId]        → item detail, edit tags, wear stats, "goes with" (Phase 4)
/generate               → occasion chips + weather → 3 outfit cards with reasoning
/outfits                → saved, favorites
/calendar               → OOTD log, streak
/stats                  → cost-per-wear, most worn, gap analysis (Phase 3)
/style-dna              → archetype profile + share card
/feed                   → fit-check feed (Phase 4)
/u/[handle]             → public profile (Phase 4)
/settings               → prefs, location, subscription
```

---

## 9. Monetization Model

| Stream | Mechanics | Timing |
|---|---|---|
| **Pro** €4–6/Mt | Unlimited generations (free = 3/day), packing mode, advanced stats, try-on later | Phase 3 |
| **Affiliate** | Gap analysis + "complete the look"; 5–10% fashion commissions | Phase 3, scales with traffic |
| **Brand collabs** | Sponsored capsule challenges | Only at 50k+ users |

Rule: the free tier must stay genuinely great — consumer apps die when the paywall hits before the magic moment.

---

## 10. Growth Playbook (this decides everything)

1. **Build in public on TikTok/IG from week 1** — "I'm 21, building an AI stylist" dev-log × men's style content hybrid; the niche has huge engagement and near-zero app competition
2. **Share-card loop:** every outfit/Style-DNA export carries subtle branding + link; measure K-factor in PostHog
3. **Seed the niche:** r/malefashionadvice, style Discords, German "Herrenmode" YouTube comments
4. **Programmatic SEO:** "what to wear: smart casual, 15°C, rain" — thousands of long-tail pages generated from your own algorithm
5. **Launch moments:** Product Hunt, r/SideProject, Show HN (the AI-reasoning angle is HN-friendly)
6. **DE localization = second audience for free**

---

## 11. Full Roadmap

| Phase | Weeks | Goal |
|---|---|---|
| 1 — Core MVP | 1 | Setup: Clerk + Supabase + schema + RLS; landing |
| | 2 | Upload flow: capture → bg removal → storage → tagging → confirm |
| | 3 | Closet grid + filters + item detail |
| | 4 | Generator: filters + scoring engine |
| | 5 | AI re-ranking + outfit cards + saving |
| | 6 | Weather, wear log → **private beta (you + friends)** |
| 2 — Consumer polish | 7–9 | Magic onboarding, share cards, OOTD calendar + streaks, Style DNA, PWA push |
| **Public launch** | 10 | Product Hunt + TikTok push; goal 1,000 signups; watch D7 retention |
| 3 — Monetization | 11–13 | Stripe Pro, free limits, stats, gap analysis + affiliate |
| 4 — Social & scale | 14–18 | Feed, follows, voting, challenges, pgvector similarity |
| Native | 19+ | Capacitor → App Store/Play; try-on AI when revenue allows |

**Kill/pivot criteria (decide now, not emotionally later):** if D7 retention < 15% after two onboarding iterations, the consumer angle isn't landing → the tech recycles into B2B (outfit-AI API for fashion e-commerce) and Phase 1 remains a top-tier portfolio piece either way.

---

## 12. Hard Parts & How to Handle Them

- **Closet digitization friction is the #1 killer** → batch capture, on-device removal, tags-editable-later; never block on perfect data; onboarding tip screen ("flat lay, good light")
- **AI tags wrong ~10%** → confirm screen always; treat corrections as free training signal for prompt tuning
- **AI cost at scale** → on-device removal, mini-model tagging (one-time per item), text-only re-ranking, cached results; Pro covers heavy users
- **Cold-start social feed** → social only ships in Phase 4 after there are users; until then share cards point *outward* to existing networks
- **App-store 30% tax** → web/PWA payments as long as possible (Spotify strategy)
- **Content treadmill** → 3 posts/week minimum, batch-produced; if you won't do content, build VereinOS instead — final warning 😄
- **Color theory is subjective** → start with the simple neutral/accent rule table, iterate against your own wardrobe; perfection is not required, *explanation* is
- **Privacy (OOTD photos, body images for try-on later)** → explicit consent flows, EU servers, deletion pipeline; GDPR rigor is a *marketing asset* in Europe
- **RLS** → flat policies, tenant tests; you know the drill

---

## 13. What You'll Learn

✅ Vision AI + prompt engineering for structured output
✅ Cost engineering for AI products (on-device ML, model tiers, caching)
✅ Recommendation/ranking algorithm design (rules × ML hybrid)
✅ Vector embeddings + pgvector similarity search
✅ Consumer growth mechanics: activation funnels, retention cohorts, K-factor, paywall design
✅ Social feed architecture (visibility rules, realtime)
✅ PWA → native via Capacitor; affiliate/e-commerce integrations
✅ Building a *brand*, not just an app — the rarest dev skill
