-- A failed image cleanup leaves a claimed snapshot. Allow its FK to detach during outfit deletion,
-- without permitting any content, timestamp, or purge-claim change.
create or replace function public.look_shares_guard_update() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.purging_at is not null then
    if old.outfit_id is not null and new.outfit_id is null
      and (to_jsonb(new) - 'outfit_id') is not distinct from (to_jsonb(old) - 'outfit_id') then
      return new;
    end if;
    raise exception 'share is being purged' using errcode = 'P0001';
  end if;
  new.updated_at := clock_timestamp();
  if new.ready_at is not null and (new.ready_at is distinct from old.ready_at or new.ready_at > new.updated_at) then
    new.ready_at := new.updated_at;
  end if;
  if new.purging_at is not null then
    new.purging_at := new.updated_at;
  end if;
  return new;
end
$$;
revoke all on function public.look_shares_guard_update() from public, anon, authenticated;
