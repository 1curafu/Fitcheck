-- Every time the user picks an occasion different from the predicted default.
-- Written from day 1, consumed by nothing yet: this is the fuel for the future
-- occasion learner (docs/superpowers/specs/2026-07-23-smart-default-occasion-design.md),
-- and override history is impossible to backfill — so it must exist now.
create table if not exists public.occasion_overrides (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  generated_on  date not null,          -- user's LOCAL date; day-of-week is derivable
  predicted     text not null,
  chosen        text not null,
  created_at    timestamptz default now()
);

create index if not exists occasion_overrides_user
  on public.occasion_overrides (user_id, generated_on);

alter table public.occasion_overrides enable row level security;

create policy occasion_overrides_own on public.occasion_overrides
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
