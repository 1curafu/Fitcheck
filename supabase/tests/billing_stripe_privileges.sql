-- Billing state is written only by service role (lib/billing/admin.ts). A signed-in user must not be able to forge a
-- Stripe customer id, a subscription status or a waiver timestamp, nor read the processed-webhook ledger.
begin;
select plan(8);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
  'billing-privileges@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

select has_column('public', 'profiles', 'stripe_customer_id', 'profiles has stripe_customer_id');
select has_table('public', 'stripe_events', 'stripe_events exists');
select ok(not has_table_privilege('authenticated', 'public.stripe_events', 'SELECT'),
  'authenticated cannot read stripe_events');
select ok(not has_table_privilege('authenticated', 'public.stripe_events', 'INSERT'),
  'authenticated cannot write stripe_events');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

select throws_ok($$update public.profiles set stripe_customer_id = 'cus_x' where id = auth.uid()$$,
  '42501', null, 'a user cannot set their Stripe customer id');
select throws_ok($$update public.profiles set subscription_status = 'active' where id = auth.uid()$$,
  '42501', null, 'a user cannot set their subscription status');
select throws_ok($$update public.profiles set pro_waiver_accepted_at = now() where id = auth.uid()$$,
  '42501', null, 'a user cannot forge a waiver timestamp');
reset role;

select is((select cancel_at_period_end from public.profiles
  where id = '33333333-3333-4333-8333-333333333333'), false, 'cancel_at_period_end defaults to false');

select * from finish();
rollback;
