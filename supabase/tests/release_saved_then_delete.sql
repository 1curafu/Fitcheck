-- PR #147 review: release + delete of a replaced set is one locked transaction.
begin;
select plan(7);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('b1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'release-owner@example.test', 'x', now(), '{}', '{}', now(), now()),
 ('b1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'release-other@example.test', 'x', now(), '{}', '{}', now(), now());
insert into public.outfits (id, user_id, look_name, generated_on, occasion, look_index, saved_at) values
 ('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'saved', '2026-10-02', 'everyday', 0, now()),
 ('b2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'plain', '2026-10-02', 'everyday', 1, null),
 ('b2000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000002', 'theirs', '2026-10-02', 'everyday', 0, null);

select ok(has_function_privilege('authenticated', 'public.release_saved_then_delete(uuid[])', 'execute'), 'signed-in users can call it');
select ok(not has_function_privilege('anon', 'public.release_saved_then_delete(uuid[])', 'execute'), 'anon cannot call it');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok($$ select public.release_saved_then_delete(array[
  'b2000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000003']::uuid[]) $$,
  'releases and deletes in one call');
reset role;

select is((select released_at is not null and look_index is null from public.outfits where id = 'b2000000-0000-4000-8000-000000000001'),
  true, 'the saved look is released with its index cleared');
select is((select look_name from public.outfits where id = 'b2000000-0000-4000-8000-000000000001'), 'saved', 'its history is kept');
select is((select count(*)::int from public.outfits where id = 'b2000000-0000-4000-8000-000000000002'), 0, 'the unsaved look is deleted');
select is((select count(*)::int from public.outfits where id = 'b2000000-0000-4000-8000-000000000003'), 1, 'another user''s look is untouched (RLS)');

select * from finish();
rollback;
