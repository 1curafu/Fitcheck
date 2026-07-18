-- Allow the Fragrance category on items (catalogued but never worn in an outfit;
-- the generator excludes it). Keeps the DB CHECK in sync with TagSchema.
alter table public.items drop constraint if exists items_category_check;
alter table public.items add constraint items_category_check
  check (category in ('Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories', 'Fragrance'));
