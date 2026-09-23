-- Emits Fitcheck's objects in the Supabase-managed `auth` and `storage` schemas as replayable SQL.
-- `supabase db dump` covers `public` only, so without this a restored project has no Storage policies (no user can
-- read a photo) and no sign-up trigger (new users get no profile). A new Supabase project has no policies in these
-- schemas, so every one captured here is Fitcheck's. Output: one header line with both counts, then one statement
-- block per row, ordered deterministically. Run with `psql -qAt -v ON_ERROR_STOP=1 -f`.
-- An empty search_path makes Postgres print every name schema-qualified (public.profiles, public.handle_new_user),
-- so the output means the same thing whatever search_path it is later replayed under.
set search_path = '';
with policies as (
  select
    schemaname || '.' || tablename || '.' || policyname as sort_key,
    format('drop policy if exists %I on %I.%I;', policyname, schemaname, tablename) || E'\n' ||
    format(
      'create policy %I on %I.%I as %s for %s to %s',
      policyname, schemaname, tablename, lower(permissive), lower(cmd),
      (select string_agg(case when role = 'public' then 'public' else quote_ident(role) end, ', ' order by role)
       from unnest(roles) as role)
    ) ||
    coalesce(E'\n  using (' || qual || ')', '') ||
    coalesce(E'\n  with check (' || with_check || ')', '') || ';' as ddl
  from pg_policies
  where schemaname in ('auth', 'storage')
),
triggers as (
  select
    n.nspname || '.' || c.relname || '.' || t.tgname as sort_key,
    format('drop trigger if exists %I on %I.%I;', t.tgname, n.nspname, c.relname) || E'\n' ||
    pg_get_triggerdef(t.oid) || ';' as ddl
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'auth' and not t.tgisinternal
)
select ddl from (
  select 0 as part, '' as sort_key,
    format('-- fitcheck-platform-objects policies=%s triggers=%s',
      (select count(*) from policies), (select count(*) from triggers)) as ddl
  union all select 1, sort_key, ddl from policies
  union all select 2, sort_key, ddl from triggers
) as statements
order by part, sort_key;
