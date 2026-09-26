-- E (spec 2026-09-26-share-a-look-design.md, §0 amendments): an anonymous public snapshot of one look, readable by
-- exact token for 30 days. Public read is ONLY get_shared_look(token); the bucket cannot be listed.

create table public.look_shares (
  id           uuid primary key default gen_random_uuid(),
  -- Minted here, never by a client (A4): a client-chosen token would let a recipient re-publish a stopped link.
  token        text not null unique
               default translate(rtrim(encode(extensions.gen_random_bytes(16), 'base64'), '='), '+/', '-_')
               check (token ~ '^[A-Za-z0-9_-]{22}$'),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  -- Rerolls delete and re-insert the day's looks; the snapshot must outlive its look.
  outfit_id    uuid references public.outfits(id) on delete set null,
  look_name    text not null,
  reasoning    text,
  occasion     text,
  pieces       jsonb not null check (jsonb_typeof(pieces) = 'array' and jsonb_array_length(pieces) between 1 and 8),
  show_brands  boolean not null default false,
  ready_at     timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index look_shares_one_per_look on public.look_shares (user_id, outfit_id) where outfit_id is not null;
create index look_shares_user_idx on public.look_shares (user_id);
create index look_shares_ready_idx on public.look_shares (ready_at);

alter table public.look_shares enable row level security;
create policy look_shares_own on public.look_shares
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Column allowlists: a table-level grant would let a client write token/id/created_at directly (see 20260924090000).
revoke all on public.look_shares from anon;
revoke insert, update on public.look_shares from authenticated;
grant insert (user_id, outfit_id, look_name, reasoning, occasion, pieces, show_brands) on public.look_shares to authenticated;
grant update (look_name, reasoning, occasion, pieces, show_brands, ready_at, updated_at) on public.look_shares to authenticated;

create function public.look_shares_cap() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.look_shares where user_id = new.user_id) >= 100 then
    raise exception 'share cap reached' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger look_shares_cap before insert on public.look_shares for each row execute function public.look_shares_cap();

create function public.get_shared_look(p_token text)
returns table (look_name text, reasoning text, occasion text, pieces jsonb, show_brands boolean, ready_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select s.look_name, s.reasoning, s.occasion, s.pieces, s.show_brands, s.ready_at, s.updated_at
  from public.look_shares s
  where p_token ~ '^[A-Za-z0-9_-]{22}$'
    and s.token = p_token
    and s.ready_at is not null
    and s.ready_at > now() - interval '30 days'
$$;
revoke all on function public.get_shared_look(text) from public;
grant execute on function public.get_shared_look(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shares', 'shares', true, 3145728, array['image/jpeg'])
on conflict (id) do nothing;

-- Token paths (never the user id), exactly the three card files, one folder deep, owned via the row, live profile.
create policy shares_rw_own on storage.objects
  for all to authenticated
  using (
    bucket_id = 'shares'
    and array_length(storage.foldername(name), 1) = 1
    and storage.filename(name) = any (array['story.jpg', 'post.jpg', 'og.jpg'])
    and exists (select 1 from public.look_shares s
                where s.token = (storage.foldername(name))[1] and s.user_id = (select auth.uid()))
    and exists (select 1 from public.profiles where id = (select auth.uid()))
  )
  with check (
    bucket_id = 'shares'
    and array_length(storage.foldername(name), 1) = 1
    and storage.filename(name) = any (array['story.jpg', 'post.jpg', 'og.jpg'])
    and exists (select 1 from public.look_shares s
                where s.token = (storage.foldername(name))[1] and s.user_id = (select auth.uid()))
    and exists (select 1 from public.profiles where id = (select auth.uid()))
  );

-- Deletion finds share images by uploader, not token (a mid-deletion share leaves no row). Service role only.
create function public.share_object_names(p_user uuid)
returns setof text
language sql stable security definer set search_path = ''
as $$ select o.name from storage.objects o where o.bucket_id = 'shares' and o.owner_id = p_user::text $$;
revoke all on function public.share_object_names(uuid) from public, anon, authenticated;
grant execute on function public.share_object_names(uuid) to service_role;
