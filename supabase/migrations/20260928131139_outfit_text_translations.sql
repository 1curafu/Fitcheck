-- Private cache; only the claim/finish RPCs may write.
alter table public.outfits add constraint outfits_id_user_id_key unique (id,user_id);
create table public.outfit_translation_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  reserved integer not null default 0 check (reserved between 0 and 60),
  completed integer not null default 0 check (completed between 0 and reserved),
  primary key (user_id,day)
);
create table public.outfit_text_translations (
  outfit_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_locale text not null,
  source_locale text not null,
  source_name text not null,
  source_why text,
  name text,
  why text,
  status text not null check (status in ('pending','ready','failed')),
  lease_token uuid,
  leased_until timestamptz,
  claim_day date,
  retry_after timestamptz,
  updated_at timestamptz not null default now(),
  primary key (outfit_id,target_locale),
  foreign key (outfit_id,user_id) references public.outfits(id,user_id) on delete cascade,
  check (target_locale in ('en-US','en-GB','uk','ru','de','fr','it','pt','es','nl')),
  check (source_locale in ('en-US','en-GB','uk','ru','de','fr','it','pt','es','nl')),
  check (char_length(source_name) <= 120),
  check (source_why is null or char_length(source_why) <= 2000),
  check (name is null or char_length(name) between 1 and 40),
  check (why is null or char_length(why) <= 1000),
  check ((status = 'pending' and lease_token is not null and leased_until is not null and claim_day is not null)
      or (status <> 'pending' and lease_token is null and leased_until is null)),
  check (status <> 'ready' or name is not null)
);
alter table public.outfit_text_translations enable row level security;
alter table public.outfit_translation_days enable row level security;
create policy outfit_text_translations_own_select on public.outfit_text_translations
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.outfit_text_translations, public.outfit_translation_days from anon, authenticated;
grant select on public.outfit_text_translations to authenticated;
