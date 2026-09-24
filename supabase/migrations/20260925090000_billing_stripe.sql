-- Billing state for Fitcheck Pro (Stripe Managed Payments). Spec: docs/superpowers/specs/2026-09-24-stripe-billing-design.md §5.
--
-- `tier` stays the ONLY entitlement source; these columns describe the Stripe subscription that drives it and are
-- written only by service role (lib/billing/admin.ts). 20260924090000 replaced the table-wide UPDATE grant with an
-- allowlist, so new columns are unwritable by `authenticated` by default — supabase/tests pins that.
alter table public.profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists subscription_interval text check (subscription_interval in ('month', 'year')),
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists pro_waiver_accepted_at timestamptz,
  add column if not exists pro_waiver_terms_version text;

-- Processed webhook events: dedupes Stripe's at-least-once delivery and leaves an audit trail.
-- RLS on with NO policies and no grants: only service role (which bypasses RLS) touches it.
create table if not exists public.stripe_events (
  id          text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;
