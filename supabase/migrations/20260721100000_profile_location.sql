-- A location RECORD, not just coordinates. Phase-2 features (morning push, daily
-- OOTD, share cards) run server-side with no browser and can only use what's here:
--   location_timezone   — to fire "8am LOCAL" (free from Open-Meteo's timezone=auto)
--   location_source     — 'geo' is a transient fix worth silently refreshing;
--                         'city' is a deliberate choice worth trusting
--   location_updated_at — tells a job a fresh fix from a year-old one
-- location_lat/lon exist since 20260614170628_profiles.sql; location_label since
-- 20260718090000_outfits.sql. RLS: profiles_update_own already covers these
-- columns, and 20260721090000_authenticated_grants.sql covers the table DML.

alter table public.profiles
  add column if not exists location_timezone   text,
  add column if not exists location_source     text
    check (location_source in ('geo', 'city')),
  add column if not exists location_updated_at timestamptz;
