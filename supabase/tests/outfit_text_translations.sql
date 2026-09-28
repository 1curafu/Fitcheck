begin;
select plan(22);
insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated','translation-a@example.test','x',now(),'{}','{}',now(),now()),
 ('33333333-3333-4333-8333-333333333333','authenticated','authenticated','translation-b@example.test','x',now(),'{}','{}',now(),now());
insert into public.outfits(id,user_id,look_name,occasion) values
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Quiet Morning','everyday'),
 ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','Second Look','everyday');
select has_table('public','outfit_text_translations','private translation cache exists');
select has_table('public','outfit_translation_days','reservation counter exists');
insert into public.outfit_text_translations(outfit_id,user_id,target_locale,source_locale,source_name,source_why,name,why,status) values
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','uk','en-US','Quiet Morning',null,'Тихий ранок',null,'ready'),
 ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','uk','en-US','Second Look',null,'Другий образ',null,'ready');
insert into public.outfit_translation_days(user_id,day,reserved,completed) values
 ('11111111-1111-4111-8111-111111111111',current_date,1,1),
 ('33333333-3333-4333-8333-333333333333',current_date,1,1);
select throws_ok($$update public.outfit_text_translations set user_id='33333333-3333-4333-8333-333333333333' where outfit_id='22222222-2222-4222-8222-222222222222'$$,'23503',null,'composite foreign key prevents owner mismatch');
select throws_ok($$update public.outfit_text_translations set target_locale='xx'$$,'23514',null,'unknown target rejected');
select throws_ok($$update public.outfit_text_translations set source_locale='xx'$$,'23514',null,'unknown source rejected');
select throws_ok($$update public.outfit_text_translations set name=''$$,'23514',null,'empty ready name rejected');
select throws_ok($$update public.outfit_text_translations set status='pending'$$,'23514',null,'pending requires a complete lease');
select throws_ok($$update public.outfit_translation_days set reserved=61$$,'23514',null,'hard daily cap enforced');
select throws_ok($$update public.outfit_translation_days set completed=2$$,'23514',null,'completed cannot exceed reserved');
set local role anon;
select throws_ok($$select * from public.outfit_text_translations$$,'42501',null,'anonymous cache read denied');
select throws_ok($$select * from public.outfit_translation_days$$,'42501',null,'anonymous counter read denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select results_eq($$select outfit_id from public.outfit_text_translations$$,$$values ('22222222-2222-4222-8222-222222222222'::uuid)$$,'only owned text is visible');
select throws_ok($$insert into public.outfit_text_translations(outfit_id) values('22222222-2222-4222-8222-222222222222')$$,'42501',null,'direct cache insert denied');
select throws_ok($$update public.outfit_text_translations set name='x'$$,'42501',null,'direct cache update denied');
select throws_ok($$delete from public.outfit_text_translations$$,'42501',null,'direct cache delete denied');
select throws_ok($$insert into public.outfit_translation_days(user_id,day) values('11111111-1111-4111-8111-111111111111',current_date)$$,'42501',null,'direct counter insert denied');
select throws_ok($$update public.outfit_translation_days set reserved=0$$,'42501',null,'direct counter update denied');
select throws_ok($$delete from public.outfit_translation_days$$,'42501',null,'direct counter delete denied');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select results_eq($$select outfit_id from public.outfit_text_translations$$,$$values ('44444444-4444-4444-8444-444444444444'::uuid)$$,'other owner cannot read the first owner cache');
reset role;
delete from public.outfits where id='22222222-2222-4222-8222-222222222222';
select is((select count(*)::int from public.outfit_text_translations where user_id='11111111-1111-4111-8111-111111111111'),0,'outfit deletion cascades translation');
delete from public.profiles where id='33333333-3333-4333-8333-333333333333';
select is((select count(*)::int from public.outfit_text_translations where user_id='33333333-3333-4333-8333-333333333333'),0,'profile deletion cascades translations');
select is((select count(*)::int from public.outfit_translation_days where user_id='33333333-3333-4333-8333-333333333333'),0,'profile deletion cascades counters');
select * from finish();
rollback;
