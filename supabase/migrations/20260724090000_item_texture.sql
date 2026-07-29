-- Knit structure / surface finish — a dimension `material` cannot express.
-- A ribbed merino knit and a flat merino shirt share a material and differ in
-- both warmth and formality; without this column that difference was lost at
-- capture time and unrecoverable afterwards.
-- Nullable: every existing row predates the field and is backfilled separately.
alter table public.items add column if not exists texture text;
