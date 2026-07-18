-- Plan 06 (Stylist generator): outfits / outfit_items / wear_logs + flat RLS.
-- outfits also persist the chosen look_name + per-look garment layout so a saved
-- outfit re-renders identically (README §8).

create table public.outfits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  name             text,
  look_name        text,
  occasion         text,
  weather_snapshot jsonb,
  layout           jsonb,
  ai_reasoning     text,
  is_favorite      boolean default false,
  created_at       timestamptz default now()
);

create table public.outfit_items (
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  item_id   uuid not null references public.items(id)   on delete cascade,
  slot      text not null,
  primary key (outfit_id, item_id)
);

create table public.wear_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  outfit_id  uuid references public.outfits(id),
  worn_on    date not null,
  occasion   text,
  photo_url  text,
  created_at timestamptz default now()
);

alter table public.outfits      enable row level security;
alter table public.outfit_items enable row level security;
alter table public.wear_logs    enable row level security;

create policy outfits_own on public.outfits
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy wear_logs_own on public.wear_logs
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy outfit_items_own on public.outfit_items
  for all
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid())))
  with check (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid())));

-- Chosen-city label for the weather strip (D8; geolocation shows "Current location").
alter table public.profiles add column if not exists location_label text;
