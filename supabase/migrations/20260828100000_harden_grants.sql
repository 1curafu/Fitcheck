-- Hardening pass, found when the hosted project was first stood up (2026-08-28)
-- and confirmed against the Supabase security advisors.
--
-- ⚠️ TRUNCATE IS NOT SUBJECT TO RLS. Every table here carries `auth.uid() =
-- user_id` policies, and none of that stops a role holding TRUNCATE from
-- emptying the table for every user. Supabase's role defaults grant it on
-- creation, so `items`, `profiles`, `outfits`, `wear_logs`, `trips` and the rest
-- all had it for BOTH `anon` and `authenticated`.
--
-- Not reachable through the Data API today — PostgREST has no TRUNCATE verb —
-- so this is a loaded gun rather than an open door. It becomes live the moment
-- anything executes SQL as those roles. Revoked rather than relied upon.
--
-- REFERENCES and TRIGGER go too: neither role has any business adding foreign
-- keys to, or triggers on, the app's tables.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- Future tables must not re-acquire them. The companion grant of
-- select/insert/update/delete for `authenticated` lives in
-- 20260721090000_authenticated_grants.sql and is deliberately left alone.
alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

-- ⚠️ Postgres grants EXECUTE to PUBLIC on every new function, so a
-- SECURITY DEFINER function in an exposed schema is a public endpoint by
-- default. Both of these are trigger functions that plpgsql refuses to call
-- outside a trigger context, so this is hygiene rather than a live hole — but
-- the advisors flag it, and an unused grant is one fewer thing to reason about.
-- The TRIGGERS still fire: a trigger runs as the table owner, not the caller.
revoke all on function public.handle_new_user() from public, anon, authenticated;
