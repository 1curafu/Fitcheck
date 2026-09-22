begin;

select plan(8);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'deletion-storage-rls@example.test',
  'not-used-by-this-test',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

select is(
  (select count(*) from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  1::bigint,
  'a live Auth user has the profile required by wardrobe access'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('wardrobe', '11111111-1111-4111-8111-111111111111/confirmed/original.jpg')
  $$,
  'a live profile retains normal wardrobe inserts'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'wardrobe' and name = '11111111-1111-4111-8111-111111111111/confirmed/original.jpg'),
  1::bigint,
  'a live profile retains normal wardrobe reads'
);

reset role;
delete from auth.users where id = '11111111-1111-4111-8111-111111111111';

select is_empty(
  $$select 1 from public.profiles where id = '11111111-1111-4111-8111-111111111111'$$,
  'deleting the Auth account deletes its profile'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('storage.allow_delete_query', 'true', true);

select is_empty(
  $$
    select 1
    from storage.objects
    where bucket_id = 'wardrobe'
      and name = '11111111-1111-4111-8111-111111111111/confirmed/original.jpg'
  $$,
  'the same stale JWT cannot select wardrobe objects after account deletion'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('wardrobe', '11111111-1111-4111-8111-111111111111/racing/original.jpg')
  $$,
  '42501',
  null,
  'the same stale JWT cannot upload after the Auth delete (earlier uploads are removed by the residual purge)'
);

select is_empty(
  $$
    update storage.objects
    set metadata = '{"attempted": true}'::jsonb
    where bucket_id = 'wardrobe'
      and name = '11111111-1111-4111-8111-111111111111/confirmed/original.jpg'
    returning 1
  $$,
  'the same stale JWT cannot update wardrobe objects after account deletion'
);

select is_empty(
  $$
    delete from storage.objects
    where bucket_id = 'wardrobe'
      and name = '11111111-1111-4111-8111-111111111111/confirmed/original.jpg'
    returning 1
  $$,
  'the same stale JWT cannot delete wardrobe objects after account deletion'
);

select * from finish();
rollback;
