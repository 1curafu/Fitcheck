-- A saved look survives set replacement; Free keeps up to ten.
alter table public.outfits
  add column if not exists saved_at timestamptz,
  add column if not exists released_at timestamptz;

update public.outfits set saved_at = created_at where is_favorite and saved_at is null;

create index outfits_saved_idx on public.outfits (user_id, saved_at desc) where saved_at is not null;

create function public.outfits_saved_limit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_tier text;
begin
  if new.saved_at is null or (tg_op = 'UPDATE' and old.saved_at is not null) then
    return new;
  end if;
  -- Serialise saves for one owner before counting, as with the share cap.
  select tier into v_tier from public.profiles where id = new.user_id for update;
  if v_tier = 'free' and (
    select count(*) from public.outfits where user_id = new.user_id and saved_at is not null and id <> new.id
  ) >= 10 then
    raise exception 'saved_outfits_limit' using errcode = 'P0001';
  end if;
  return new;
end
$$;
revoke all on function public.outfits_saved_limit() from public, anon, authenticated;

create trigger outfits_saved_limit before insert or update of saved_at on public.outfits
  for each row execute function public.outfits_saved_limit();
