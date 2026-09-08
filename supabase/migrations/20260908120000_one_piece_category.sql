-- A one-piece garment fills the upper and lower slot at once.
--
-- Dresses, jumpsuits, playsuits, boilersuits. Without this category the tagger
-- has to file a dress as Tops or Bottoms, and the generator then pairs it with
-- trousers — a silent failure that produces a wrong outfit rather than an error,
-- and one that happens at CAPTURE, so every affected row needs correcting by
-- hand afterwards.
--
-- ⚠️ NOT a gender concept. A one-piece is a garment shape; a boilersuit uses the
-- same slot as a wrap dress.
--
-- ⚠️ The CHECK constraint enumerates the categories, so it is replaced rather
-- than extended: an insert of 'One-piece' fails until this runs, and it would
-- fail at the very end of the capture flow, after the upload and the model call
-- have already been paid for.
alter table public.items drop constraint if exists items_category_check;
alter table public.items add constraint items_category_check
  check (
    category = any (
      array['Tops'::text, 'Bottoms'::text, 'One-piece'::text, 'Outerwear'::text,
            'Shoes'::text, 'Bags'::text, 'Accessories'::text, 'Fragrance'::text]
    )
  );
