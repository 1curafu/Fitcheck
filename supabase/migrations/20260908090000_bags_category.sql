-- Bags become their own category, separate from worn accessories.
--
-- Carried and worn items behave differently in three mechanisms, and category
-- is how the generator expresses a slot:
--   * cap — you carry one bag, but you can wear a watch AND a bracelet
--   * colour — a bag is a visible colour block and counts against the palette,
--     where a watch case is hardware and does not (see lib/generator/styling/metal.ts)
--   * packing — a bag is carried for a whole trip, not re-picked daily
--
-- ⚠️ The CHECK constraint has to be replaced, not merely extended: it enumerates
-- the categories, so an insert of 'Bags' fails until this runs. Adding the value
-- to TagSchema without this migration would let the app write a row the database
-- rejects, and the failure would surface at the very end of the capture flow,
-- after the upload and the model call have already been paid for.
alter table public.items drop constraint if exists items_category_check;
alter table public.items add constraint items_category_check
  check (
    category = any (
      array['Tops'::text, 'Bottoms'::text, 'Outerwear'::text, 'Shoes'::text,
            'Bags'::text, 'Accessories'::text, 'Fragrance'::text]
    )
  );

-- Move the bags that were captured before the category existed.
--
-- ⚠️ Matched on `subcategory`, which the tagger writes from the photograph, and
-- never on `name`, which the user is free to edit into anything. A rename must
-- not silently re-file a garment.
--
-- ⚠️ Deliberately conservative. It moves only what is unambiguously a carried
-- bag; anything it misses stays an accessory and can be corrected in the edit
-- sheet, which is a smaller harm than dragging a wearable piece out of the
-- accessory slot. 'wallet' is included because a clutch is frequently tagged
-- that way — the local closet's own "Clutch Bag" arrived from the model as
-- "Clutch wallet", and it is a visible carried piece, not a billfold.
update public.items
set category = 'Bags'
where category = 'Accessories'
  and subcategory is not null
  and (
    subcategory ilike '%bag%'
    or subcategory ilike '%clutch%'
    or subcategory ilike '%wallet%'
    or subcategory ilike '%backpack%'
    or subcategory ilike '%tote%'
    or subcategory ilike '%purse%'
    or subcategory ilike '%satchel%'
    or subcategory ilike '%holdall%'
  );
