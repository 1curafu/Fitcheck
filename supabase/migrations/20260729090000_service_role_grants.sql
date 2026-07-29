-- Table-level DML grants for `service_role`, the counterpart to
-- 20260721090000_authenticated_grants.sql.
--
-- `service_role` bypasses RLS but NOT table privileges, so without this it hits
-- the same 42501 "permission denied" that `authenticated` did on newer Supabase
-- DB images. Surfaced by scripts/backfill-item-tags.ts, which is the only thing
-- in the project that uses this role: it crosses all users' rows to normalise
-- legacy free-text materials onto the constrained vocabulary.
--
-- Nothing in the app runs as service_role — there is no service-role bypass in
-- app code (CLAUDE.md), and this grant does not create one.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;

-- future tables in public inherit the same grants
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
