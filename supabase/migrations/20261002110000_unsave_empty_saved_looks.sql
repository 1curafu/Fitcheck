-- A saved look whose last piece is permanently deleted can't be opened or unsaved, so it would hold a Free slot forever.
-- Unsave it when its final outfit_items row goes; the row itself stays for wear/share history.
create function public.outfits_unsave_when_empty() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  update public.outfits o set saved_at = null
   where o.id = old.outfit_id and o.saved_at is not null
     and not exists (select 1 from public.outfit_items i where i.outfit_id = old.outfit_id);
  return null;
end
$$;
revoke all on function public.outfits_unsave_when_empty() from public, anon, authenticated;

create trigger outfit_items_unsave_when_empty after delete on public.outfit_items
  for each row execute function public.outfits_unsave_when_empty();

-- Bookmarks carried over by the saved-outfits backfill may already be empty.
update public.outfits o set saved_at = null
 where o.saved_at is not null and not exists (select 1 from public.outfit_items i where i.outfit_id = o.id);
