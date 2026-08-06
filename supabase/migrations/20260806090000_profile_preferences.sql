-- One jsonb bag rather than a column per switch: preferences accrete, and a
-- migration per toggle is friction that leads to toggles living in localStorage
-- instead. Defaults live in lib/profile/preferences.ts, not here, so a profile
-- row written before a preference existed still reads correctly.
--
-- No CHECK on the shape. The column is read through readPreferences(), which
-- falls back to defaults on anything it cannot parse; a constraint here would
-- turn a bad write into a 500 on the settings screen instead.
alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;
