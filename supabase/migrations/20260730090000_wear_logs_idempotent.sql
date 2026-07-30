-- One wear per outfit per day. The "Wear this today" button is a TOGGLE, and a
-- double tap (or a retried Server Action) must not produce two rows — every
-- wear count in the product is a count of these.
create unique index if not exists wear_logs_unique_day
  on public.wear_logs (user_id, outfit_id, worn_on)
  where outfit_id is not null;

-- Reading a wear back needs the outfit; reading the diary needs the date.
create index if not exists wear_logs_user_day_idx
  on public.wear_logs (user_id, worn_on desc);

-- The FK was declared with no ON DELETE action (NO ACTION), so deleting an
-- outfit that had been worn raised a foreign-key violation. saveDailyLooks is
-- delete-then-insert, so a Regenerate after a wear would have failed outright.
--
-- The primary fix lives in lib/outfits/daily.ts: a worn outfit is PINNED — it is
-- excluded from the day's delete, so it survives a Regenerate and stays in the
-- day's set. This constraint is the second line of defence, so any future delete
-- path degrades to "wear kept, outfit forgotten" instead of a 500.
alter table public.wear_logs
  drop constraint if exists wear_logs_outfit_id_fkey;
alter table public.wear_logs
  add constraint wear_logs_outfit_id_fkey
  foreign key (outfit_id) references public.outfits(id) on delete set null;
