-- The wardrobe bucket accepted any content type and size. RLS (wardrobe_rw_own) lets a signed-in user write
-- their own folder directly with the anon key, so validating types in the Server Actions alone is bypassable:
-- the bucket itself must refuse anything the capture pipeline does not produce.
--
-- Writers checked 2026-09-26: capture actions (original.jpg image/jpeg; cutout + thumb image/webp|image/png),
-- scripts/backfill-thumbs.ts (image/webp), e2e seed/helpers (png/webp/jpeg), and restore.sh's rclone copy,
-- which labels objects by extension (.jpg/.png/.webp). Existing objects are not re-checked by this change.
--
-- 10 MiB matches next.config.ts's Server Action bodySizeLimit; originals are compressed to ~0.5 MB and legacy
-- PNG cutouts stay far below it.
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
       file_size_limit = 10485760
 where id = 'wardrobe';
