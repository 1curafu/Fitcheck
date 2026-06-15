-- profiles: one row per auth user (id = auth.users.id).
-- Supabase Auth is the identity source — no clerk_id.
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text,
  handle          text unique,
  -- style quiz (the prototype's 6 questions)
  archetype       text,            -- Old Money | Smart Casual | Preppy | Streetwear
  palette         text,            -- Neutrals | Earth | Navy | Mono
  fit             text,            -- Tailored | Relaxed | Oversized
  dress_codes     text[],          -- Loungewear | Casual | Smart casual | Business | Black tie
  occasions       text[],          -- Work | Everyday | Weekend | Evening
  nogos           text[],          -- logos | skinny | bright | shorts | ripped | double_denim | graphic | square_toe
  formality_min   int default 1,   -- derived from dress_codes (for the generator's band)
  formality_max   int default 5,
  location_lat    double precision,
  location_lon    double precision,
  locale          text default 'en',
  style_dna       jsonb,
  ootd_streak     int default 0,
  onboarded_at    timestamptz,
  created_at      timestamptz default now()
);

alter table public.profiles enable row level security;

-- A user can read and update only their own profile.
-- (select auth.uid()) is the perf-optimised form; TO authenticated + ownership
-- predicate avoids the BOLA/IDOR trap; update needs both USING and WITH CHECK.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Auto-create the profile row on signup. SECURITY DEFINER so the trigger can
-- insert past RLS; schema-qualified names + empty search_path per Supabase guidance.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
