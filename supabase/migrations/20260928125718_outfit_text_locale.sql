-- Record original prose language without changing names, reasoning or dates.
alter table public.outfits add column text_locale text not null default 'en-US';
alter table public.outfits add constraint outfits_text_locale_check
  check (text_locale in ('en-US','en-GB','uk','ru','de','fr','it','pt','es','nl'));
