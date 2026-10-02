-- `rls_auto_enable()` was created outside migrations (dashboard "auto-enable RLS"): an event-trigger function that
-- anyone could call via /rest/v1/rpc. Revoking EXECUTE leaves the `ensure_rls` event trigger working.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
