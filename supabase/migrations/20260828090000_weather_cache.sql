-- Weather is identical for everyone in a place on a day, so it is cached per
-- place per day rather than per user. `roundCoord` (2dp ≈ 1.1km) already
-- normalises the key at the boundary — that is why it exists.
--
-- ⚠️ Postgres, not Next's Data Cache: that cache is per-deployment, not
-- guaranteed shared across instances, and gone on redeploy. Decision 6 records
-- the sibling trap — `use cache` is in-memory and dies with the instance. This
-- is also where the Redis question landed: rejected, because Postgres already
-- IS the cache.
create table if not exists public.weather_cache (
  lat        numeric(6,2) not null,
  lon        numeric(6,2) not null,
  day        date         not null,
  -- ⚠️ The TIME-INVARIANT series in OUR shape — never the provider's raw
  -- response, and never a now-relative view. Everything `mapForecast` returns
  -- depends on the moment of asking (high/low are the peak still AHEAD, not the
  -- calendar day's), so a collapsed payload cached for a day would plan an
  -- evening look against a peak that has already passed. Store the hourly cells
  -- and the daily block; derive the view per request.
  payload    jsonb        not null,
  -- Read for staleness, not decoration: a row fetched at 06:00 is an 18-hour-old
  -- prediction by midnight. See WEATHER_MAX_AGE_H in lib/weather/cache.ts.
  fetched_at timestamptz  not null default now(),
  primary key (lat, lon, day)
);

alter table public.weather_cache enable row level security;

-- ⚠️ READ-ONLY to every client. There is deliberately NO insert or update
-- policy: PostgREST is a PUBLIC endpoint, so `insert ... with check (true)`
-- would let any user with their own JWT POST a fabricated forecast and poison
-- every user in that city. Writes go through the service role in
-- `lib/weather/cache.ts` and nowhere else.
create policy "weather_cache_read" on public.weather_cache
  for select using (auth.uid() is not null);

grant select on public.weather_cache to authenticated;

-- ⚠️ NOT redundant with the missing insert policy. Supabase's default
-- privileges grant INSERT/UPDATE/DELETE/TRUNCATE on every new public table to
-- `authenticated`, and **TRUNCATE IS NOT SUBJECT TO RLS** — verified on this
-- table: the insert was denied by the policy, the truncate SUCCEEDED. Without
-- this revoke any signed-in user could empty the whole cache. RLS is the guard
-- for rows; the grant is the guard for the table, and this table needs both.
revoke insert, update, delete, truncate on public.weather_cache from authenticated, anon;
