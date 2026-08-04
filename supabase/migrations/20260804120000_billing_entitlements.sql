-- Which tier a user is on. A plain text column with a check constraint rather
-- than an enum type: adding a tier later ('trialing', when the trial model is
-- decided) is then an ALTER of the constraint, not a type migration with a
-- rewrite.
--
-- This is the ONLY source of tier truth. Nothing derives a tier from a Stripe
-- webhook payload at read time; billing's job will be to write this column.
alter table public.profiles
  add column if not exists tier text not null default 'free'
  check (tier in ('free', 'pro'));

-- `profiles` carries a self-update RLS policy, so without this a user could run
-- `update profiles set tier = 'pro'` from the browser with the anon key and
-- grant themselves the paid tier. RLS decides WHICH ROWS you may touch; it does
-- not decide which COLUMNS, so the policy alone cannot express "you own this row
-- but not this field".
--
-- Reads are unaffected (the own-row select policy still applies), and the local
-- dev override is an env var (FITCHECK_FORCE_TIER), not this column, so nothing
-- in development depends on writing it. Billing will write it as service_role.
revoke update (tier) on public.profiles from authenticated;

-- Every real AI generation, recorded.
--
-- The `outfits` rows CANNOT serve as this counter, for two independent reasons:
--
--   1. A regenerate REPLACES the day's rows for an occasion (saveDailyLooks is
--      delete-then-insert), so the act of regenerating erases its own evidence.
--      Counting rows afterwards cannot tell a first drop from a fifth.
--   2. saveDailyLooks writes one row per LOOK, three per generation, so a row
--      count reports 3 after a single drop.
--
-- This ledger is append-only and is the only thing the meter reads.
create table if not exists public.generation_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  occasion     text not null,
  generated_on date not null,          -- the user's LOCAL date, as with outfits
  -- Three kinds, not a boolean. "Style an outfit with this" (PR #22) is neither
  -- the day's free drop for an occasion nor a regenerate of one: recording it as
  -- a drop would mark that occasion as already dropped, and recording it as a
  -- regenerate would make styling eat the regenerate allowance.
  kind         text not null check (kind in ('drop', 'regenerate', 'styled')),
  created_at   timestamptz not null default now()
);

alter table public.generation_events enable row level security;

create policy generation_events_own on public.generation_events
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The meter's hot path: "what has this user spent on their local today?"
create index if not exists generation_events_user_day_idx
  on public.generation_events (user_id, generated_on);

grant select, insert on public.generation_events to authenticated;
