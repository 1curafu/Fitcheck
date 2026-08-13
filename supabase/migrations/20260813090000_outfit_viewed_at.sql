-- The evening confirmation asks ONLY about looks the user actually opened, so
-- opening one has to leave a trace. Nothing recorded that before this.
--
-- Why it matters: the alternative — asking about today's drop — would offer a
-- "Yes" on a look the user never saw, and a Yes there is a fabricated wear.
-- wear_logs is the foundation of cost-per-wear, streaks, most-worn and gap
-- analysis, so a fabricated row poisons every one of them permanently, with no
-- way afterwards to tell it from a real one. That is exactly why the
-- "Auto-log worn looks" toggle was rejected twice.
--
-- A column on `outfits`, not a views table: the question is "was it opened, and
-- when most recently", never a history. One timestamp answers it.
alter table public.outfits
  add column if not exists viewed_at timestamptz;

-- The confirmation reads "today's outfits that were viewed, most recent first".
create index if not exists outfits_viewed_idx
  on public.outfits (user_id, generated_on, viewed_at desc)
  where viewed_at is not null;
