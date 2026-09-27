-- Follow-up to 20260928090000: serialize the cap and make public-image cleanup a one-way claim.
-- The claim commits before Storage I/O. Uploads hold a share-row lock until their metadata write commits,
-- so a claim waits for an in-flight write before it begins deleting images.

alter table public.look_shares add column purging_at timestamptz;
grant update (purging_at) on public.look_shares to authenticated;

create or replace function public.look_shares_cap() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- One profile row is a stable per-user lock. The next transaction counts only after the previous insert commits.
  perform 1 from public.profiles where id = new.user_id for no key update;
  if (select count(*) from public.look_shares where user_id = new.user_id) >= 100 then
    raise exception 'share cap reached' using errcode = 'P0001';
  end if;
  return new;
end
$$;
revoke all on function public.look_shares_cap() from public, anon, authenticated;

create function public.look_shares_guard_update() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.purging_at is not null then
    raise exception 'share is being purged' using errcode = 'P0001';
  end if;
  -- Clients can write these columns for the app flow, but cannot choose a future TTL or orphan grace period.
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
create trigger look_shares_guard_update before update on public.look_shares
for each row execute function public.look_shares_guard_update();
revoke all on function public.look_shares_guard_update() from public, anon, authenticated;

-- Any pre-migration future client timestamps are normalized before the guard is active on new writes.
update public.look_shares
set ready_at = clock_timestamp(), updated_at = clock_timestamp()
where ready_at > clock_timestamp();
update public.look_shares
set updated_at = clock_timestamp()
where updated_at > clock_timestamp();

create or replace function public.get_shared_look(p_token text)
returns table (look_name text, reasoning text, occasion text, pieces jsonb, show_brands boolean, ready_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select s.look_name, s.reasoning, s.occasion, s.pieces, s.show_brands, s.ready_at, s.updated_at
  from public.look_shares s
  where p_token ~ '^[A-Za-z0-9_-]{22}$'
    and s.token = p_token
    and s.purging_at is null
    and s.ready_at is not null
    and s.ready_at > now() - interval '30 days'
$$;

-- Invoker rights keep the owner check under look_shares RLS. FOR SHARE serializes metadata writes with a purge claim.
create function public.share_upload_allowed(p_token text) returns boolean
language plpgsql volatile security invoker set search_path = ''
as $$
declare allowed boolean;
begin
  select true into allowed
  from public.look_shares s
  where s.token = p_token and s.user_id = (select auth.uid()) and s.purging_at is null
  for share;
  return coalesce(allowed, false);
end
$$;
revoke all on function public.share_upload_allowed(text) from public, anon, authenticated;
grant execute on function public.share_upload_allowed(text) to authenticated;

drop policy shares_rw_own on storage.objects;

-- A claimed row still allows the owner to list and remove its three images for retryable cleanup.
create policy shares_select_own on storage.objects for select to authenticated
using (
  bucket_id = 'shares'
  and array_length(storage.foldername(name), 1) = 1
  and storage.filename(name) = any (array['story.jpg', 'post.jpg', 'og.jpg'])
  and exists (select 1 from public.look_shares s
              where s.token = (storage.foldername(name))[1] and s.user_id = (select auth.uid()))
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);
create policy shares_delete_own on storage.objects for delete to authenticated
using (
  bucket_id = 'shares'
  and array_length(storage.foldername(name), 1) = 1
  and storage.filename(name) = any (array['story.jpg', 'post.jpg', 'og.jpg'])
  and exists (select 1 from public.look_shares s
              where s.token = (storage.foldername(name))[1] and s.user_id = (select auth.uid()))
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);
create policy shares_insert_unclaimed on storage.objects for insert to authenticated
with check (
  bucket_id = 'shares'
  and array_length(storage.foldername(name), 1) = 1
  and storage.filename(name) = any (array['story.jpg', 'post.jpg', 'og.jpg'])
  and public.share_upload_allowed((storage.foldername(name))[1])
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);
create policy shares_update_unclaimed on storage.objects for update to authenticated
using (
  bucket_id = 'shares'
  and array_length(storage.foldername(name), 1) = 1
  and storage.filename(name) = any (array['story.jpg', 'post.jpg', 'og.jpg'])
  and public.share_upload_allowed((storage.foldername(name))[1])
  and exists (select 1 from public.profiles where id = (select auth.uid()))
)
with check (
  bucket_id = 'shares'
  and array_length(storage.foldername(name), 1) = 1
  and storage.filename(name) = any (array['story.jpg', 'post.jpg', 'og.jpg'])
  and public.share_upload_allowed((storage.foldername(name))[1])
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);
