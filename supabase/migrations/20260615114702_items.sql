-- items: one row per wardrobe piece. Categories match the prototype + closet filters.
create table public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  image_url   text not null,                 -- original (storage path)
  cutout_url  text,                           -- background-removed (storage path)
  name        text,                           -- e.g. "Brushed Oxford" (user-editable)
  brand       text,
  category    text not null check (category in ('Tops','Bottoms','Outerwear','Shoes','Accessories')),
  subcategory text,                           -- e.g. "Oxford shirt"
  colors      text[] not null default '{}',
  pattern     text,
  material    text,
  formality   int check (formality between 1 and 5),
  seasons     text[] default '{}',
  price       numeric,                         -- enables cost-per-wear later
  archived    boolean default false,
  created_at  timestamptz default now()
);
create index items_user_idx on public.items (user_id) where not archived;

alter table public.items enable row level security;

create policy "items_all_own"
  on public.items for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- private storage bucket; object paths are  <user_id>/<item_id>/<file>
insert into storage.buckets (id, name, public)
  values ('wardrobe', 'wardrobe', false)
  on conflict (id) do nothing;

create policy "wardrobe_rw_own"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text);
