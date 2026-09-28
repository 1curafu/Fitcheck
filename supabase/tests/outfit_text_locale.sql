begin;
select plan(5);
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'text-owner@example.test', 'x', now(), '{}', '{}', now(), now());
insert into public.outfits (id,user_id,look_name,ai_reasoning,occasion)
values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Original name',null,'everyday');
select col_default_is('public','outfits','text_locale', 'en-US', 'legacy text defaults to English');
select is((select text_locale from public.outfits where id='22222222-2222-4222-8222-222222222222'),'en-US','legacy row has English provenance');
select throws_ok($$update public.outfits set text_locale='xx'$$,'23514',null,'unknown locale rejected');
select lives_ok($$update public.outfits set text_locale='uk'$$,'Ukrainian provenance accepted');
select is((select look_name from public.outfits where id='22222222-2222-4222-8222-222222222222'),'Original name','provenance never rewrites original prose');
select * from finish();
rollback;
