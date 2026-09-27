-- Follow-up to 20260928090000: a signed-in client can write look_shares directly, and get_shared_look serves the row to
-- anyone. Bound the public text (lib/share/snapshot.ts SHARE_LIMITS clips to the same values), and let a share point
-- only at the writer's own look.

alter table public.look_shares
  add constraint look_shares_look_name_len check (char_length(look_name) between 1 and 120),
  add constraint look_shares_reasoning_len check (reasoning is null or char_length(reasoning) <= 1000),
  add constraint look_shares_occasion_len check (occasion is null or char_length(occasion) <= 40),
  -- Text length, not pg_column_size: jsonb compresses, so a repetitive payload would pass a stored-size check.
  add constraint look_shares_pieces_size check (octet_length(pieces::text) <= 8192);

alter policy look_shares_own on public.look_shares
  with check (
    (select auth.uid()) = user_id
    and (outfit_id is null
      or exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid())))
  );
