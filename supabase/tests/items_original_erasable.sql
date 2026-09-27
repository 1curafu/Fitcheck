-- R2: an erased original leaves image_url null, but a piece must always keep one image to show.
begin;

select plan(5);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'erase-owner@example.test',
   'not-used-by-this-test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'erase-other@example.test',
   'not-used-by-this-test', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.items (id, user_id, image_url, cutout_url, category)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333',
   '33333333-3333-4333-8333-333333333333/f1/original.jpg', '33333333-3333-4333-8333-333333333333/f1/cutout.webp', 'Tops'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '44444444-4444-4444-8444-444444444444',
   '44444444-4444-4444-8444-444444444444/f2/original.jpg', '44444444-4444-4444-8444-444444444444/f2/cutout.webp', 'Tops');

select ok(
  (select is_nullable = 'YES' from information_schema.columns
    where table_schema = 'public' and table_name = 'items' and column_name = 'image_url'),
  'image_url may be null once the original is erased'
);

select throws_ok(
  $$ insert into public.items (user_id, image_url, cutout_url, category)
     values ('33333333-3333-4333-8333-333333333333', null, null, 'Tops') $$,
  '23514',
  null,
  'a piece must keep at least one image to show'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);

select lives_ok(
  $$ update public.items set image_url = null, archived = true where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'an owner can erase the original of their own piece'
);

select is(
  (select image_url from public.items where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  null,
  'the erase is persisted'
);

-- A data-modifying CTE cannot sit in a subquery; is_empty runs the statement at top level
-- (same pattern as supabase/tests/account_deletion_storage_rls.sql).
select is_empty(
  $$ update public.items set image_url = null where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1 $$,
  'a user cannot erase another user''s original'
);

select * from finish();
rollback;
