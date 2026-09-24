-- A signed-in user may update only the profile columns the app itself writes on their behalf.
--
-- `profiles_update_own` (RLS) decides WHICH ROW a user may update; it cannot decide which COLUMNS. That is the job of
-- grants — and a column-level `revoke update (tier)` does NOT narrow a table-level `grant update`, which Supabase gives
-- `anon` and `authenticated` by default. Before 20260924090000 a user could run `update profiles set tier = 'pro'`
-- and grant themselves the paid tier. These tests pin the column allowlist so a new column (billing state in
-- particular) is never user-writable by accident.
begin;

select plan(9);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated',
  'profile-privileges@example.test', 'not-used-by-this-test', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
);

select is(
  (
    select array_agg(column_name::text order by column_name::text)
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ),
  array[
    'archetype', 'dress_codes', 'fit', 'formality_max', 'formality_min',
    'location_label', 'location_lat', 'location_lon', 'location_source',
    'location_timezone', 'location_updated_at', 'nogos', 'occasions',
    'onboarded_at', 'palette', 'preferences'
  ],
  'authenticated may update exactly the columns the app writes, and nothing else'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'authenticated holds no table-wide UPDATE on profiles'
);

select ok(
  not has_column_privilege('anon', 'public.profiles', 'tier', 'UPDATE'),
  'anon cannot update profiles.tier'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.profiles set tier = 'pro' where id = auth.uid()$$,
  '42501',
  null,
  'a user cannot grant themselves Pro'
);

select throws_ok(
  $$update public.profiles set created_at = now() where id = auth.uid()$$,
  '42501',
  null,
  'a user cannot rewrite columns outside the allowlist'
);

select lives_ok(
  $$update public.profiles
      set archetype = 'minimal', palette = 'neutral', fit = 'regular',
          dress_codes = array['Casual'], occasions = array['Work'], nogos = array[]::text[],
          formality_min = 2, formality_max = 2, onboarded_at = now()
    where id = auth.uid()$$,
  'onboarding can still save the style profile'
);

select lives_ok(
  $$update public.profiles set preferences = '{}'::jsonb where id = auth.uid()$$,
  'settings can still save preferences'
);

select lives_ok(
  $$update public.profiles
      set location_lat = 47.37, location_lon = 8.54, location_label = 'Zurich',
          location_source = 'city', location_timezone = 'Europe/Zurich', location_updated_at = now()
    where id = auth.uid()$$,
  'the stylist and settings can still save a location'
);

reset role;

select is(
  (select tier from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  'free',
  'the tier is still free after every attempt'
);

select * from finish();
rollback;
