-- An Auth JWT can remain valid briefly after an account is deleted. Keep the
-- existing bucket and path ownership checks, then also require the live profile
-- row that the Auth-user delete cascades away. This closes that stale-session
-- upload/read window while the deletion coordinator purges private Storage.
drop policy if exists "wardrobe_rw_own" on storage.objects;

create policy "wardrobe_rw_own"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
    )
  );
