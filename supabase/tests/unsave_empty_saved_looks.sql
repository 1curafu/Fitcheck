-- PR #148 review: a saved look whose last piece is permanently deleted stops counting as saved.
begin;
select plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('d1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'empty-saved@example.test', 'x', now(), '{}', '{}', now(), now());
insert into public.items (id, user_id, category, image_url) values
 ('d3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'Tops', 'd1000000-0000-4000-8000-000000000001/a/original.jpg'),
 ('d3000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001', 'Shoes', 'd1000000-0000-4000-8000-000000000001/b/original.jpg');
insert into public.outfits (id, user_id, look_name, saved_at) values
 ('d2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'two pieces', now());
insert into public.outfit_items (outfit_id, item_id, slot) values
 ('d2000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 'top'),
 ('d2000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000002', 'shoes');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
delete from public.items where id = 'd3000000-0000-4000-8000-000000000001';
select isnt((select saved_at from public.outfits where id = 'd2000000-0000-4000-8000-000000000001'), null,
  'a look with a piece left stays saved');
delete from public.items where id = 'd3000000-0000-4000-8000-000000000002';
select is((select saved_at from public.outfits where id = 'd2000000-0000-4000-8000-000000000001'), null,
  'deleting its last piece unsaves the look, freeing the slot');
select is((select count(*)::int from public.outfits where id = 'd2000000-0000-4000-8000-000000000001'), 1,
  'the look row itself is kept (wear and share history)');
reset role;
select ok(not has_function_privilege('anon', 'public.outfits_unsave_when_empty()', 'execute'), 'the trigger function is not public');

select * from finish();
rollback;
