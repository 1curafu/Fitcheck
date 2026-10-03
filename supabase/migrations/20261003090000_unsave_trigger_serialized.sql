-- Two concurrent deletes of a saved look's last two pieces each saw the other's row and left it saved (PR #148 review).
-- Lock the affected looks in id order, then re-check emptiness: the check runs in a fresh snapshot after any concurrent
-- delete has committed. Statement-level, so one deletion of many pieces locks each look once.
drop trigger if exists outfit_items_unsave_when_empty on public.outfit_items;

create or replace function public.outfits_unsave_when_empty() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.outfits o where o.id in (select g.outfit_id from gone g) order by o.id for update;
  update public.outfits o set saved_at = null
   where o.id in (select g.outfit_id from gone g) and o.saved_at is not null
     and not exists (select 1 from public.outfit_items i where i.outfit_id = o.id);
  return null;
end
$$;
revoke all on function public.outfits_unsave_when_empty() from public, anon, authenticated;

create trigger outfit_items_unsave_when_empty after delete on public.outfit_items
  referencing old table as gone for each statement execute function public.outfits_unsave_when_empty();
