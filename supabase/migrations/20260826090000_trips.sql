-- A trip is a real entity, not a one-shot render (spec decision #4). You plan on
-- Sunday, pack on Thursday and check it at the airport; if it were regenerated
-- each time it would answer differently every time and nobody would trust it.
-- Same shape as the daily drop (Decision 5), keyed by trip instead of by day.
create table if not exists public.trips (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  destination_label  text not null,
  lat                double precision not null,
  lon                double precision not null,
  timezone           text not null,
  start_date         date not null,
  end_date           date not null,
  -- { "work": 3, "everyday": 2, "evening": 2, "weekend": 0 }
  occasion_mix       jsonb not null default '{}'::jsonb,
  -- The re-wear meter position, 1-5. `maxWears` clamps, so one bad row degrades
  -- a trip rather than breaking it.
  rewear_level       int not null default 3,
  created_at         timestamptz not null default now()
);

create table if not exists public.trip_items (
  trip_id uuid not null references public.trips(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  -- The user insisted on this piece: seeded into the solve at zero cost and it
  -- survives a re-solve.
  pinned  boolean not null default false,
  primary key (trip_id, item_id)
);

-- Per-day looks reuse outfits/outfit_items rather than a third table.
-- ⚠️ NULLABLE, and that is load-bearing: every existing row predates this, and
-- the daily drop must be completely untouched by this migration.
alter table public.outfits add column if not exists trip_id uuid references public.trips(id) on delete cascade;
alter table public.outfits add column if not exists trip_day date;

create index if not exists outfits_trip_idx on public.outfits (trip_id, trip_day);
create index if not exists trips_user_idx on public.trips (user_id, start_date desc);

alter table public.trips enable row level security;
alter table public.trip_items enable row level security;

create policy "trips_rw_own" on public.trips
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- `trip_items` has no user_id of its own; ownership is the parent trip's. Kept
-- FLAT — one EXISTS, no recursion — per the project's RLS rule.
create policy "trip_items_rw_own" on public.trip_items
  for all using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

-- A trip is one metered event alongside drop/regenerate/styled. RECORDED, NOT
-- LIMITED (spec decision #5): metering a Pro feature would contradict the
-- "unlimited daily looks" it is sold on, but a trip that writes nothing to the
-- ledger is invisible when someone asks what a user actually costs.
alter table public.generation_events drop constraint if exists generation_events_kind_check;
alter table public.generation_events add constraint generation_events_kind_check
  check (kind in ('drop', 'regenerate', 'styled', 'trip'));

grant select, insert, update, delete on public.trips to authenticated;
grant select, insert, update, delete on public.trip_items to authenticated;
