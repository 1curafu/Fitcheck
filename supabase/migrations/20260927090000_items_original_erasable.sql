-- R2 (spec 2026-09-26-piece-archive-restore-erase-design.md): a user may erase a piece's ORIGINAL photo. The row,
-- cut-out and thumbnail stay, so past looks remain complete. image_url = null means "original erased".
-- The check keeps every piece renderable: displayPath prefers the cut-out and falls back to the original, so a row
-- with neither would be a blank tile. Existing rows all carry an image_url, so the check validates immediately.
alter table public.items alter column image_url drop not null;

alter table public.items add constraint items_has_display_image
  check (image_url is not null or cutout_url is not null);
