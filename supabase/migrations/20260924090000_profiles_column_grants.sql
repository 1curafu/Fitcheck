-- Close the self-upgrade hole: a signed-in user could `update profiles set tier = 'pro'` on their own row.
--
-- 20260804120000_billing_entitlements.sql ran `revoke update (tier) on public.profiles from authenticated`, but
-- Supabase grants `anon` and `authenticated` UPDATE on the WHOLE table by default, and Postgres does not let a
-- column-level revoke narrow a table-level grant — `has_column_privilege(authenticated, profiles.tier, UPDATE)` stayed
-- true. RLS (`profiles_update_own`) only decides which ROW; which COLUMNS is the job of grants, so the table-wide grant
-- is replaced with an explicit allowlist.
--
-- The allowlist is exactly what the app writes as the user today (the server client, never service role):
--   * onboarding — app/onboarding/actions.ts (style profile + derived formality band + onboarded_at)
--   * preferences — app/settings/actions.ts, app/outfits/[id]/actions.ts
--   * location — lib/weather/location.ts `locationColumns`, via app/settings and app/generate actions
-- Everything else (id, tier, created_at, identity/derived columns, and every billing column that L3 adds) is writable
-- only by service_role. A future user-editable column needs its own `grant update (col)` here — and
-- supabase/tests/profiles_column_privileges.sql pins the list so that choice is deliberate.

revoke update on public.profiles from anon, authenticated;

grant update (
  archetype,
  palette,
  fit,
  dress_codes,
  occasions,
  nogos,
  formality_min,
  formality_max,
  onboarded_at,
  preferences,
  location_lat,
  location_lon,
  location_label,
  location_source,
  location_timezone,
  location_updated_at
) on public.profiles to authenticated;
