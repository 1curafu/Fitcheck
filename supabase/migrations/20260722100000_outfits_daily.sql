-- The daily drop (see CLAUDE.md "Decision 5"): looks are generated ONCE per
-- local day per occasion and then read back, not regenerated on every tap.
--
-- generated_on is the USER'S local date (lib/outfits/local-date.ts), never UTC.
-- look_index is the position within the day's set of three, so the order the
-- stylist chose survives a round trip.
alter table public.outfits
  add column if not exists generated_on date,
  add column if not exists look_index    smallint;

-- One row per (user, occasion, day, position). A regenerate deletes the day's
-- rows and re-inserts, so this also stops a double-submit writing six looks.
create unique index if not exists outfits_daily_unique
  on public.outfits (user_id, occasion, generated_on, look_index)
  where generated_on is not null;

-- The read path: "today's set for this occasion".
create index if not exists outfits_daily_lookup
  on public.outfits (user_id, occasion, generated_on);
