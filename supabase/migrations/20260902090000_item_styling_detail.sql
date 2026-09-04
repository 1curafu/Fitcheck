-- The six details the ranking engine needs and the capture flow threw away.
--
-- `accent_color` is the load-bearing one. `lib/ai/tag-item.ts` used to instruct
-- the model "colors — ... Ignore small logos and hardware", so a white sneaker
-- with a blue swoosh and a plain white sneaker stored identically as {white}.
-- The generator could not prefer the one that picked up the shirt because the
-- swoosh did not exist in the database. Removing that instruction without a
-- column to put the answer in would only pollute `colors`, which drives the
-- 3-colour ceiling — hence a separate column with its own smaller weight.
--
-- All six are NULLABLE: every existing row predates them, and the generator
-- drops any term whose evidence is missing rather than guessing. Same precedent
-- as 20260724090000_item_texture.sql.
alter table public.items add column if not exists accent_color text;

-- How loud the visible branding is: 'None' | 'Small' | 'Large'.
-- Two independent sources cap an outfit at ~2 visible logos, so this is counted
-- per outfit, not judged per garment.
alter table public.items add column if not exists branding text;

-- How the garment is CUT and worn: 'Fitted'|'Tailored'|'Regular'|'Relaxed'|'Oversized'.
-- ⚠️ The one field the user answers rather than the model. "Oversized" is
-- relative to a body and the cutout has no body in it — the model can see a
-- wide-leg trouser is wide, but not that it was bought two sizes up on purpose.
alter table public.items add column if not exists fit text;

-- WHERE THE HEM FALLS ON THE BODY:
-- 'Cropped' | 'Natural waist' | 'Hip' | 'Knee' | 'Midi' | 'Ankle' | 'Floor'.
-- Body-referenced rather than role-relative, because the rule-of-thirds and
-- volume-balance formulas are defined by where a hem falls, not by fabric
-- fullness — and because a trouser's "break" IS its hem placement, so one
-- vocabulary serves tops, bottoms, one-pieces and outerwear alike.
-- 'Floor' covers both a floor-length gown and a trouser stacking over the shoe:
-- both mean the hem reaches the ground, which is what the stacking-vs-chunky-sole
-- rule compares.
alter table public.items add column if not exists length text;

-- Visible wear: 'None' | 'Faded' | 'Ripped'.
-- Added 2026-09-01. Research states a HARD rule — "distressed, ripped, or
-- light-wash denim is excluded from business formal and most business casual" —
-- and r1-ext specifies "tailored, distress-free jeans" for classic casual too, so
-- this is not womenswear-specific.
-- ⚠️ Only HALF that rule needed a new column. LIGHT WASH is already expressible:
-- material 'Denim' plus a light colour (`sky`, `denim`) versus a dark one
-- (`indigo`, `navy`) distinguishes wash without any new field. What nothing
-- carried was DISTRESSING — rips, whiskering, abrasion.
-- Chosen over a `wash` column for exactly that reason: a wash column would
-- duplicate what `colors` already says, and two sources for one fact drift.
-- 'Faded' = whiskering/fading/abrasion, no holes. 'Ripped' = holes, tears,
-- deliberate destruction. Reliably visible in a cutout, unlike `fit`.
alter table public.items add column if not exists distressing text;

-- Footwear silhouette only: 'Low profile' | 'Regular' | 'Chunky'. Null elsewhere.
-- Needed because stacking and chunky soles are mutually exclusive, and chunky
-- soles require wide-leg trousers — both rules compare bulk against `length`.
alter table public.items add column if not exists bulk text;
