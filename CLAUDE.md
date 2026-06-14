# CLAUDE.md — Fitcheck

> **Fitcheck** — Your closet, digitized. Upload your wardrobe once, get AI-styled outfits every day, matched to occasion, weather, and your aesthetic — with a one-sentence reason *why* each outfit works.

This file is the authoritative architecture record. The full product spec lives in
[`fitcheck-complete-spec.md`](./fitcheck-complete-spec.md) — read it for the product vision,
feature phases, DB schema, and roadmap. **This file records the engineering decisions made on top
of that spec**, including the places where we deliberately diverged from it. When code conflicts
with this file, the code is the source of truth — update this file.

> Status: **pre-code.** No `package.json` yet. Decisions below are committed; scaffolding is next.

---

## Tech stack (committed)

### Phase 1 MVP — build this, nothing more

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript 6** | PWA from day 1. Turbopack default. Server Actions keep AI keys server-side. |
| Styling | **Tailwind v4 + shadcn/ui + Motion** (`motion/react`) | App must look premium — invest in a custom theme + transition polish. `motion` is the successor to `framer-motion`. |
| Auth | **Supabase Auth** (Apple/Google OAuth) | See [Decision 1](#decision-1-supabase-auth-not-clerk). |
| DB / Storage | **Supabase (Postgres + Storage)**, **EU region** | RLS everywhere. pgvector + Realtime come in later phases. |
| Background removal | **`@imgly/background-removal`** (client-side WASM) | Zero per-image cost. Cache the model download. |
| Image compression | **`browser-image-compression`** (client-side) | Compress before upload. |
| AI — tagging + reasoning | **Claude Haiku 4.5** (`claude-haiku-4-5`) | See [Decision 3](#decision-3-ai-implementation). |
| Weather | **Open-Meteo** | Free, no key, great EU coverage. |
| Deployment | **Vercel** (+ Supabase EU region) | |

### Deferred — DO NOT build during Phase 1

Wire structure where cheap (i18n folders), but don't implement these until their phase:

- **TanStack Query + Zustand** — lean on Server Components + Server Actions first. Add TanStack Query
  only for the closet grid (optimistic updates); Zustand only for the generator wizard flow.
- **Cloudinary / external CDN** — Supabase Storage + `next/image` is enough for MVP. Add a CDN only if image costs bite.
- **`@vercel/og` share cards** — Phase 2.
- **next-intl (DE content)** — ship EN first; the structure can exist, the German content waits for launch.
- **PostHog** (Phase 2), **Stripe** (Phase 3), **web-push** (Phase 2), **pgvector / CLIP** (Phase 4), **Capacitor** (native, Phase 4+).

---

## Key architectural decisions

These override the spec where they conflict. The spec's Section 4 lists some choices we changed.

### Decision 1: Supabase Auth, NOT Clerk
The spec says Clerk + `clerk_id` + webhook-sync, but *also* says "RLS everywhere: `user_id = auth.uid()`."
Those don't coexist natively — `auth.uid()` is a Supabase Auth concept. We use **Supabase Auth**:
- `profiles.id` **is** the auth user id. **There is no `clerk_id` column** (delete it from the spec schema).
- RLS policies are a clean `user_id = auth.uid()`.
- A Postgres trigger (`on auth.users insert → insert into profiles`) creates the profile row. No webhook, no sync service.
- Social login (Apple/Google) is built with `supabase.auth.signInWithOAuth` + a custom shadcn-styled screen.

### Decision 2: Client-side background removal
`@imgly/background-removal` runs in-browser via WASM — **zero per-image cost**, which is non-negotiable
at consumer scale on a free tier. Accept the few-MB first-load model download; cache it.

### Decision 3: AI implementation
**One model, two distinct modes. Conflating them is how these apps get expensive.**

All AI runs in **Next.js Server Actions** — the Anthropic API key never reaches the browser.

1. **Item tagging (vision, once per item, ever)**
   - Send the **cutout image** to `claude-haiku-4-5`.
   - Use **structured outputs** (`output_config.format` with a JSON schema) so the model is *constrained*
     to the exact tag schema (category, subcategory, colors[], pattern, material, formality 1–5, seasons[]).
     Do **not** prompt-and-parse — schema-constrain it. No markdown-wrapped JSON, no parse failures.
   - Always show a **confirm screen** — AI is ~90% right; the user fixes the rest. Never trust tags blindly.
   - Cost ≈ **$0.002/item, one time**. A 100-item closet ≈ 23¢.

2. **Outfit reasoning (text only, never images)**
   - Final step of the hybrid generator: **rules filter (SQL) → scoring (TS) → AI re-rank (one cheap text call)**.
   - Send the top ~20 candidate combos as **tag descriptions** (e.g. "camel knit / grey trousers / brown loafers"),
     plus aesthetic + occasion + weather. **Never send images here** — it's ~50× cheaper as text.
   - Returns top 3 + a one-sentence "why," stored in `outfits.ai_reasoning`.
   - This sentence is the product differentiator AND the share-card copy — protect its quality.

### Decision 4: Cost discipline is a feature
On-device bg removal (free) · mini-model tagging (one-time per item) · text-only re-ranking · cache results.
The free tier must stay genuinely great — consumer apps die when the paywall hits before the magic moment.

---

## Conventions

- **AI keys & secrets**: server-side only (Server Actions / route handlers). Never in client components.
- **RLS**: every table. Keep policies **flat — no recursion**. Add tenant tests.
- **Tags are always user-editable** — treat AI tags as a draft, corrections as free prompt-tuning signal.
- **GDPR is a marketing asset**: EU region, explicit consent flows, a real deletion pipeline.
- **Don't gate the magic moment** — onboarding must reach "first 3 outfits" before any signup wall (Phase 2 goal).

## Anthropic / Claude API notes

- Model id: **`claude-haiku-4-5`** (200K context, $1/$5 per 1M tokens, vision + structured outputs).
- Use the official `@anthropic-ai/sdk`. For guaranteed JSON, use `output_config.format` (structured outputs),
  not assistant prefills (prefills 400 on current models).
- When working on anything Claude/Anthropic-related, consult the `claude-api` skill rather than guessing
  model ids, pricing, or SDK syntax.

---

## Pointers

- Product spec, DB schema, roadmap, growth playbook → [`fitcheck-complete-spec.md`](./fitcheck-complete-spec.md)
- Routes/pages map → spec §8
- Outfit generation algorithm → spec §7
