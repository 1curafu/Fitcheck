-- A styling returns a SET of looks, not one.
--
-- `outfits_styled_unique (user_id, styled_item_id, generated_on)` allowed exactly
-- one row per piece per local day, which is what bounded a styling to a single
-- look. Widening it needs an ordinal.
--
-- ⚠️ That ordinal is NOT `look_index`, and this is the trap worth reading.
-- Styled rows keep `look_index` NULL on purpose: `outfits_daily_unique` covers
-- (user_id, occasion, generated_on, look_index), and Postgres treats NULLs as
-- distinct, which is the only reason a styled look and the day's drop can share
-- an occasion without colliding. Giving styled rows a real `look_index` would
-- reintroduce that collision — a styled look at index 0 for `work` today would
-- clash with the drop's look 0. So the order lives in its own column.
alter table public.outfits
  add column if not exists styled_index smallint;

-- Existing styled rows are the first look of their set.
update public.outfits
  set styled_index = 0
  where styled_item_id is not null and styled_index is null;

drop index if exists outfits_styled_unique;

create unique index outfits_styled_unique
  on public.outfits (user_id, styled_item_id, generated_on, styled_index)
  where styled_item_id is not null;
