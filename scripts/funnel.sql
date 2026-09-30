-- Fitcheck acquisition funnel, weekly signup cohorts. READ-ONLY — paste into the Supabase SQL editor.
--
-- Steps 1–2 (landing view → CTA click) are Vercel Analytics page views of "/" and "/sign-in" (per locale).
-- They are cookieless, so they cannot be joined to accounts: compare them with this table BY WEEK, not per person.
-- Steps 3–5 below are per-user: registration, first piece within 7 days, first daily look within 7 days.
with signups as (
  select id, created_at from public.profiles where created_at >= now() - interval '12 weeks'
),
first_item as (
  select user_id, min(created_at) as at from public.items group by user_id
),
first_drop as (
  select user_id, min(created_at) as at from public.generation_events where kind = 'drop' group by user_id
)
select
  date_trunc('week', s.created_at)::date                                         as week,
  count(*)                                                                         as registrations,
  count(*) filter (where fi.at <= s.created_at + interval '7 days')               as first_item_7d,
  count(*) filter (where fd.at <= s.created_at + interval '7 days')               as first_look_7d
from signups s
left join first_item fi on fi.user_id = s.id
left join first_drop fd on fd.user_id = s.id
group by 1
order by 1 desc;
