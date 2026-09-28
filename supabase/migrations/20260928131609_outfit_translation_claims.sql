-- Lock order in both writers: UTC counter days, owned outfits by UUID, then cache.
-- Direct table writes stay revoked; identity comes only from the authenticated JWT.
create or replace function public.claim_outfit_text_translations(p_outfit_ids uuid[], p_locale text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_day date := (clock_timestamp() at time zone 'UTC')::date;
  v_reserved integer;
  v_outfit public.outfits%rowtype;
  v_cache public.outfit_text_translations%rowtype;
  v_source jsonb;
  v_status text;
  v_token uuid;
  v_result jsonb := '[]'::jsonb;
begin
  if v_user is null or not exists(select 1 from public.profiles p where p.id=v_user) then
    raise exception 'Not authenticated' using errcode='42501';
  end if;
  if p_locale is null or p_locale not in ('en-US','en-GB','uk') or
     coalesce(cardinality(p_outfit_ids),0) not between 1 and 6 or array_position(p_outfit_ids,null) is not null then
    raise exception 'Invalid translation request' using errcode='22023';
  end if;
  insert into public.outfit_translation_days(user_id,day) values(v_user,v_day) on conflict do nothing;
  select d.reserved into v_reserved from public.outfit_translation_days d where d.user_id=v_user and d.day=v_day for update;
  delete from public.outfit_translation_days d where d.user_id=v_user and d.day < v_day-90;
  for v_outfit in
    select o.* from public.outfits o where o.user_id=v_user and o.id=any(p_outfit_ids) order by o.id for update
  loop
    if btrim(coalesce(v_outfit.look_name,''))='' or char_length(v_outfit.look_name)>120 or char_length(v_outfit.ai_reasoning)>2000 then continue; end if;
    v_source := jsonb_build_object('id',v_outfit.id,'sourceLocale',v_outfit.text_locale,'name',coalesce(v_outfit.look_name,''),'why',v_outfit.ai_reasoning);
    v_token := null;
    if v_outfit.text_locale=p_locale then
      v_status := 'source';
    else
      select c.* into v_cache from public.outfit_text_translations c where c.outfit_id=v_outfit.id and c.target_locale=p_locale and c.user_id=v_user for update;
      if found and v_cache.source_locale=v_outfit.text_locale and v_cache.source_name=coalesce(v_outfit.look_name,'') and v_cache.source_why is not distinct from v_outfit.ai_reasoning then
        v_status := case
          when v_cache.status='ready' then 'ready'
          when v_cache.status='pending' and v_cache.leased_until>clock_timestamp() then 'busy'
          when v_cache.status='failed' and v_cache.retry_after>clock_timestamp() then 'cooldown'
          else null end;
      else v_status := null;
      end if;
      if v_status is null then
        if v_reserved>=60 then v_status := 'limited';
        else
          v_status := 'claimed';
          v_token := gen_random_uuid();
          v_reserved := v_reserved+1;
          update public.outfit_translation_days d set reserved=v_reserved where d.user_id=v_user and d.day=v_day;
          insert into public.outfit_text_translations(outfit_id,user_id,target_locale,source_locale,source_name,source_why,status,lease_token,leased_until,claim_day)
          values(v_outfit.id,v_user,p_locale,v_outfit.text_locale,coalesce(v_outfit.look_name,''),v_outfit.ai_reasoning,'pending',v_token,clock_timestamp()+interval '60 seconds',v_day)
          on conflict(outfit_id,target_locale) do update set
            user_id=excluded.user_id,source_locale=excluded.source_locale,source_name=excluded.source_name,source_why=excluded.source_why,
            name=null,why=null,status='pending',lease_token=excluded.lease_token,leased_until=excluded.leased_until,
            claim_day=excluded.claim_day,retry_after=null,updated_at=clock_timestamp();
        end if;
      end if;
    end if;
    v_result := v_result || jsonb_build_array(jsonb_build_object('source',v_source,'status',v_status,'leaseToken',v_token));
  end loop;
  return v_result;
end;
$$;

create or replace function public.finish_outfit_text_translations(p_locale text,p_results jsonb)
returns uuid[] language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
  v_outfit public.outfits%rowtype;
  v_cache public.outfit_text_translations%rowtype;
  v_ids uuid[] := '{}'::uuid[];
  v_accepted uuid[] := '{}'::uuid[];
  v_id uuid;
  v_token uuid;
  v_uuid_pattern text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if v_user is null or not exists(select 1 from public.profiles p where p.id=v_user) then
    raise exception 'Not authenticated' using errcode='42501';
  end if;
  if p_locale is null or p_locale not in ('en-US','en-GB','uk') or p_results is null or jsonb_typeof(p_results)<>'array' then
    raise exception 'Invalid translation completion' using errcode='22023';
  end if;
  if jsonb_array_length(p_results)>6 then raise exception 'Invalid translation completion' using errcode='22023'; end if;
  for v_result in select value from jsonb_array_elements(p_results) loop
    if jsonb_typeof(v_result)<>'object' or
       jsonb_typeof(v_result->'outfitId') is distinct from 'string' or
       jsonb_typeof(v_result->'leaseToken') is distinct from 'string' or
       coalesce(v_result->>'outfitId','') !~ v_uuid_pattern or coalesce(v_result->>'leaseToken','') !~ v_uuid_pattern or
       coalesce(v_result->>'status','') not in ('ready','failed') then
      raise exception 'Invalid translation completion' using errcode='22023';
    end if;
    v_id := (v_result->>'outfitId')::uuid;
    if v_id=any(v_ids) then raise exception 'Duplicate translation completion' using errcode='22023'; end if;
    v_ids := array_append(v_ids,v_id);
    if v_result->>'status'='ready' and (
       jsonb_typeof(v_result->'name') is distinct from 'string' or
       btrim(v_result->>'name')='' or char_length(v_result->>'name')>40 or
       not(v_result ? 'why') or jsonb_typeof(v_result->'why') not in ('string','null') or
       char_length(v_result->>'why')>1000 or (jsonb_typeof(v_result->'why')='string' and btrim(v_result->>'why')='')) then
      raise exception 'Invalid translation output' using errcode='22023';
    end if;
  end loop;
  -- Read claim days without a cache lock first. A changed token below is ignored;
  -- no completion may acquire a new day's counter while holding an outfit lock.
  perform 1 from public.outfit_translation_days d where d.user_id=v_user and d.day in (
    select c.claim_day from public.outfit_text_translations c where c.user_id=v_user and c.target_locale=p_locale and c.outfit_id=any(v_ids)
  ) order by d.day for update;
  for v_outfit in
    select o.* from public.outfits o where o.user_id=v_user and o.id=any(v_ids) order by o.id for update
  loop
    select value into v_result from jsonb_array_elements(p_results) where (value->>'outfitId')::uuid=v_outfit.id;
    v_token := (v_result->>'leaseToken')::uuid;
    select c.* into v_cache from public.outfit_text_translations c where c.outfit_id=v_outfit.id and c.target_locale=p_locale and c.user_id=v_user for update;
    if not found or v_cache.status<>'pending' or v_cache.lease_token<>v_token or v_cache.leased_until<=clock_timestamp() then continue; end if;
    if v_cache.source_locale<>v_outfit.text_locale or v_cache.source_name<>coalesce(v_outfit.look_name,'') or v_cache.source_why is distinct from v_outfit.ai_reasoning then
      delete from public.outfit_text_translations c where c.outfit_id=v_outfit.id and c.target_locale=p_locale and c.user_id=v_user and c.lease_token=v_token;
      continue;
    end if;
    if v_result->>'status'='ready' then
      if (v_outfit.ai_reasoning is null) <> (v_result->>'why' is null) then
        raise exception 'Invalid translation reasoning' using errcode='22023';
      end if;
      update public.outfit_text_translations c set status='ready',name=v_result->>'name',why=v_result->>'why',lease_token=null,leased_until=null,retry_after=null,updated_at=clock_timestamp()
      where c.outfit_id=v_outfit.id and c.target_locale=p_locale and c.user_id=v_user;
      update public.outfit_translation_days d set completed=completed+1 where d.user_id=v_user and d.day=v_cache.claim_day;
      v_accepted := array_append(v_accepted,v_outfit.id);
    else
      update public.outfit_text_translations c set status='failed',name=null,why=null,lease_token=null,leased_until=null,retry_after=clock_timestamp()+interval '10 minutes',updated_at=clock_timestamp()
      where c.outfit_id=v_outfit.id and c.target_locale=p_locale and c.user_id=v_user;
    end if;
  end loop;
  return v_accepted;
end;
$$;
revoke all on function public.claim_outfit_text_translations(uuid[],text),public.finish_outfit_text_translations(text,jsonb) from public,anon;
grant execute on function public.claim_outfit_text_translations(uuid[],text),public.finish_outfit_text_translations(text,jsonb) to authenticated;
