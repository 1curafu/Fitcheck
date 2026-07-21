-- Table-level DML grants for the `authenticated` role on the public app tables.
-- RLS still restricts WHICH rows each user can touch (auth.uid() = user_id); but
-- without these table grants Postgres returns 42501 "permission denied" regardless
-- of policy. Older Supabase DB images auto-granted this; newer ones do not, so we
-- make it explicit and portable (survives `supabase db reset` / fresh volumes).

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;

-- future tables in public inherit the same grants for authenticated
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
