-- Replace a set atomically: lock its rows, release saved looks, delete the rest. A concurrent save waits on the lock
-- and then sees the row released or gone, so no unsaved row can stay in the set and collide with the new one.
create function public.release_saved_then_delete(p_ids uuid[]) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  perform 1 from public.outfits where id = any(p_ids) order by id for update;
  update public.outfits set released_at = now(), look_index = null, styled_index = null
    where id = any(p_ids) and saved_at is not null;
  delete from public.outfits where id = any(p_ids) and saved_at is null;
end
$$;
revoke all on function public.release_saved_then_delete(uuid[]) from public, anon;
grant execute on function public.release_saved_then_delete(uuid[]) to authenticated;
