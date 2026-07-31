-- "Style an outfit with this" (item detail, Fitcheck.dc.html:654).
--
-- A styled look is an ordinary `outfits` row, so /outfits/[id] renders it with
-- no second screen — it just answers a different question: not "what should I
-- wear today?" but "what goes with THIS?".
--
-- Decision 5 is not bypassed. That decision says never pay twice for a question
-- already answered, which is why the daily drop caches; styling around a
-- specific piece is a NEW question, and this column is what lets its answer be
-- cached the same way.
alter table public.outfits
  add column if not exists styled_item_id uuid references public.items(id) on delete cascade;

-- The cache key: one styled look per item per local day. A second tap on the
-- same piece is a read, not a generation.
create unique index if not exists outfits_styled_unique
  on public.outfits (user_id, styled_item_id, generated_on)
  where styled_item_id is not null;

-- NOTE for whoever touches the daily drop next: styled rows carry
-- `generated_on` (so they expire daily) but leave `look_index` NULL. Postgres
-- treats NULLs as distinct in a unique index, so `outfits_daily_unique`
-- (user_id, occasion, generated_on, look_index) cannot collide across two
-- styled looks on the same day. loadDailyLooks/saveDailyLooks additionally
-- filter `styled_item_id is null`, or a styled look would appear as a fourth
-- look in the drop and be deleted by the next regenerate.
