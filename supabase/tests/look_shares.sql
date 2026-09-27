-- E (spec 2026-09-26-share-a-look-design.md §0 A1/A4/A5): owner-only rows, token minted by the database, a 30-day
-- public read by exact token, and a bucket writable only at shares/<own token>/{story,post,og}.jpg.
begin;
select plan(28);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'share-owner@example.test', 'x', now(), '{}', '{}', now(), now()),
  ('66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'share-other@example.test', 'x', now(), '{}', '{}', now(), now());
insert into public.outfits (id, user_id, look_name, occasion)
values ('77777777-7777-4777-8777-777777777777', '55555555-5555-4555-8555-555555555555', 'Quiet Camel', 'everyday');

-- Rows inserted as the table owner (tests only): fixed tokens so the assertions can name them.
insert into public.look_shares (token, user_id, outfit_id, look_name, reasoning, pieces, ready_at) values
  ('AAAAAAAAAAAAAAAAAAAAAA', '55555555-5555-4555-8555-555555555555', '77777777-7777-4777-8777-777777777777',
   'Quiet Camel', 'Why it works.', '[{"n":1,"name":"Camel overcoat","category":"Outerwear","brand":null}]', now()),
  ('BBBBBBBBBBBBBBBBBBBBBB', '55555555-5555-4555-8555-555555555555', null, 'Draft', null,
   '[{"n":1,"name":"Knit","category":"Tops","brand":null}]', null),
  ('EEEEEEEEEEEEEEEEEEEEEE', '55555555-5555-4555-8555-555555555555', null, 'Old', null,
   '[{"n":1,"name":"Knit","category":"Tops","brand":null}]', now() - interval '31 days');

select is((select count(*)::int from public.get_shared_look('AAAAAAAAAAAAAAAAAAAAAA')), 1, 'a ready share is public by token');
select is((select look_name from public.get_shared_look('AAAAAAAAAAAAAAAAAAAAAA')), 'Quiet Camel', 'it returns the snapshot');
select is((select count(*)::int from public.get_shared_look('BBBBBBBBBBBBBBBBBBBBBB')), 0, 'a not-ready share is not public');
select is((select count(*)::int from public.get_shared_look('EEEEEEEEEEEEEEEEEEEEEE')), 0, 'a share older than 30 days is not public');
select is((select count(*)::int from public.get_shared_look('nope')), 0, 'a malformed token returns nothing');
select is((select count(*)::int from public.get_shared_look('CCCCCCCCCCCCCCCCCCCCCC')), 0, 'an unknown token returns nothing');

delete from public.outfits where id = '77777777-7777-4777-8777-777777777777';
select is((select count(*)::int from public.look_shares where token = 'AAAAAAAAAAAAAAAAAAAAAA' and outfit_id is null), 1,
  'deleting the look (a reroll) keeps the share, detached');

select ok(not has_function_privilege('anon', 'public.share_object_names(uuid)', 'EXECUTE'), 'anon cannot list share objects');
select ok(not has_function_privilege('authenticated', 'public.share_object_names(uuid)', 'EXECUTE'), 'users cannot list share objects');
select ok(has_function_privilege('anon', 'public.get_shared_look(text)', 'EXECUTE'), 'anyone may read a share by token');

-- share_object_names finds objects by uploader.
insert into storage.objects (bucket_id, name, owner_id) values
  ('shares', 'AAAAAAAAAAAAAAAAAAAAAA/og.jpg', '55555555-5555-4555-8555-555555555555'),
  ('shares', 'ZZZZZZZZZZZZZZZZZZZZZZ/og.jpg', '66666666-6666-4666-8666-666666666666');
set local role service_role;
select is((select count(*)::int from public.share_object_names('55555555-5555-4555-8555-555555555555')), 1, 'objects are found by their uploader');
reset role;

set local role anon;
select throws_ok($$ select count(*) from public.look_shares $$, '42501', null, 'anon has no table access');
select is_empty($$ select 1 from storage.objects where bucket_id = 'shares' $$, 'anon cannot list the shares bucket');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
select set_config('request.jwt.claims', '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}', true);
select is((select count(*)::int from public.look_shares), 0, 'another user sees none of my shares');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('shares', 'AAAAAAAAAAAAAAAAAAAAAA/story.jpg', '66666666-6666-4666-8666-666666666666') $$,
  '42501', null, 'another user cannot write into my share folder');
select throws_ok($$ insert into public.look_shares (token, user_id, look_name, pieces)
  values ('DDDDDDDDDDDDDDDDDDDDDD', '66666666-6666-4666-8666-666666666666', 'x', '[{"n":1}]') $$,
  '42501', null, 'a client cannot choose a token');
select lives_ok($$ insert into public.look_shares (user_id, look_name, pieces)
  values ('66666666-6666-4666-8666-666666666666', 'Mine', '[{"n":1}]') $$, 'a client insert gets a database token');
select matches((select token from public.look_shares where look_name = 'Mine'), '^[A-Za-z0-9_-]{22}$', 'the minted token is 22 url-safe chars');
select throws_ok($$ update public.look_shares set token = 'DDDDDDDDDDDDDDDDDDDDDD' where look_name = 'Mine' $$,
  '42501', null, 'a client cannot change a token');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}', true);
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('shares', 'AAAAAAAAAAAAAAAAAAAAAA/story.jpg', '55555555-5555-4555-8555-555555555555') $$, 'the owner can write a card image');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('shares', 'AAAAAAAAAAAAAAAAAAAAAA/x.jpg', '55555555-5555-4555-8555-555555555555') $$,
  '42501', null, 'only the three card file names are writable');
reset role;

-- Revocation is a database claim before Storage cleanup. A stale JWT may delete but cannot upload into that folder.
set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}', true);
select lives_ok($$ update public.look_shares set purging_at = now() where token = 'AAAAAAAAAAAAAAAAAAAAAA' $$,
  'the owner can claim a link for purging');
select is((select count(*)::int from public.get_shared_look('AAAAAAAAAAAAAAAAAAAAAA')), 0,
  'a claimed link is immediately unavailable to anonymous readers');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('shares', 'AAAAAAAAAAAAAAAAAAAAAA/post.jpg', '55555555-5555-4555-8555-555555555555') $$,
  '42501', null, 'a claimed folder refuses a new upload');
select throws_ok($$ update public.look_shares set ready_at = now() where token = 'AAAAAAAAAAAAAAAAAAAAAA' $$,
  'P0001', 'share is being purged', 'a claimed row cannot be republished');
select lives_ok($$ update public.look_shares set ready_at = now() + interval '2 years', updated_at = now() + interval '2 years'
  where token = 'BBBBBBBBBBBBBBBBBBBBBB' $$, 'a direct owner update is allowed but gets server timestamps');
select ok((select abs(extract(epoch from ready_at - clock_timestamp())) < 10
    and abs(extract(epoch from updated_at - clock_timestamp())) < 10
    from public.look_shares where token = 'BBBBBBBBBBBBBBBBBBBBBB'),
  'a client cannot set a future expiry timestamp');
reset role;

-- The cap: the 101st row for one user is refused.
insert into public.look_shares (user_id, look_name, pieces)
  select '66666666-6666-4666-8666-666666666666', 'filler', '[{"n":1}]' from generate_series(1, 99);
select throws_ok($$ insert into public.look_shares (user_id, look_name, pieces)
  values ('66666666-6666-4666-8666-666666666666', 'over', '[{"n":1}]') $$, 'P0001', 'share cap reached', 'a user holds at most 100 shares');

select * from finish();
rollback;
