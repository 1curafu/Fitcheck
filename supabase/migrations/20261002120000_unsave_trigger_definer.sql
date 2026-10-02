-- Account deletion cascades to outfit_items as supabase_auth_admin, which may not update public.outfits: run the
-- unsave trigger as its owner. It only clears saved_at on the outfit whose last piece was just removed.
alter function public.outfits_unsave_when_empty() security definer;
