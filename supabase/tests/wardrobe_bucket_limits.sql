begin;

select plan(3);

-- The bucket, not only the Server Actions, must refuse non-image uploads: RLS lets a signed-in user write
-- their own folder directly with the anon key, so an action-side check alone is bypassable.
select is(
  (select array(select unnest(allowed_mime_types) order by 1) from storage.buckets where id = 'wardrobe'),
  array['image/jpeg', 'image/png', 'image/webp']::text[],
  'wardrobe accepts only the three image types the capture pipeline produces'
);

select ok(
  (select file_size_limit from storage.buckets where id = 'wardrobe') is not null,
  'wardrobe has a per-object size limit'
);

select is(
  (select file_size_limit from storage.buckets where id = 'wardrobe'),
  10485760::bigint,
  'the size limit matches the 10 MB Server Action body limit'
);

select * from finish();
rollback;
