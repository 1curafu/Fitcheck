begin;
select plan(17);

select has_column('public', 'outfits', 'saved_at', 'looks can be saved');
select has_column('public', 'outfits', 'released_at', 'saved looks can leave a set');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'saved-free@example.test', 'x', now(), '{}', '{}', now(), now()),
 ('a1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'saved-pro@example.test', 'x', now(), '{}', '{}', now(), now());
update public.profiles set tier = 'pro' where id = 'a1000000-0000-4000-8000-000000000002';
insert into public.outfits (user_id, look_name, generated_on, occasion, look_index)
select 'a1000000-0000-4000-8000-000000000001', 'free-' || n, '2026-10-02', 'everyday', n from generate_series(1, 12) n;
insert into public.outfits (user_id, look_name)
select 'a1000000-0000-4000-8000-000000000002', 'pro-' || n from generate_series(1, 13) n;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok($$ update public.outfits set saved_at = now() where look_index <= 10 $$, 'Free can save ten');
select is((select count(*)::int from public.outfits where saved_at is not null), 10, 'ten saves are persisted');
select throws_ok($$ update public.outfits set saved_at = now() where look_name = 'free-11' $$,
 'P0001', 'saved_outfits_limit', 'the eleventh save is refused');
select lives_ok($$ update public.outfits set saved_at = null where look_name = 'free-1';
 update public.outfits set saved_at = now() where look_name = 'free-11' $$, 'unsaving makes room for a new save');
select lives_ok($$ update public.outfits set saved_at = now() where look_name = 'free-2' $$, 'an existing save can be updated at the limit');
select throws_ok($$ insert into public.outfits (user_id, saved_at) values ('a1000000-0000-4000-8000-000000000001', now()) $$,
 'P0001', 'saved_outfits_limit', 'saved inserts obey the same limit');
select is((select count(*)::int from public.outfits where user_id = 'a1000000-0000-4000-8000-000000000002'), 0, 'another owner is invisible');
select lives_ok($$ update public.outfits set released_at = now(), look_index = null where look_name = 'free-2' $$, 'a saved look can be released');
select ok((select saved_at is not null and generated_on = '2026-10-02' and occasion = 'everyday'
 and released_at is not null and look_index is null from public.outfits where look_name = 'free-2'), 'release retains saved history');

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok($$ update public.outfits set saved_at = now() where look_name <> 'pro-13' $$, 'Pro saves more than ten');
reset role;
update public.profiles set tier = 'free' where id = 'a1000000-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*)::int from public.outfits where saved_at is not null), 12, 'downgrade retains all saves');
select lives_ok($$ update public.outfits set saved_at = null where look_name = 'pro-1' $$, 'unsaving remains allowed after downgrade');
select throws_ok($$ update public.outfits set saved_at = now() where look_name = 'pro-13' $$,
 'P0001', 'saved_outfits_limit', 'downgraded users cannot add saves while over the limit');
reset role;
select ok(not has_function_privilege('anon', 'public.outfits_saved_limit()', 'EXECUTE'), 'the trigger is not an anonymous RPC');
select ok(not has_function_privilege('authenticated', 'public.outfits_saved_limit()', 'EXECUTE'), 'the trigger is not a user RPC');

select * from finish();
rollback;
