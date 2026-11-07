-- Allow longer formative comments (table already permits 800; RPC was capped at 400).
create or replace function public.forge_v2_store_ratings(p_owner uuid, p_id uuid, p_revision integer, p_summary text, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.forge_v2_sessions; item jsonb; expected uuid[]; got uuid[];
begin
  select * into r from public.forge_v2_sessions where id = p_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('code','missing'); end if;
  if r.revision <> p_revision or r.state <> 'rating' then return jsonb_build_object('code','conflict'); end if;
  if p_summary is null or char_length(btrim(p_summary)) not between 1 and 800 or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('code','invalid');
  end if;
  select coalesce(array_agg(id order by position), '{}') into expected from public.forge_v2_turns
    where session_id = r.id and skipped = false and student_text is not null;
  select coalesce(array_agg((value->>'turnId')::uuid), '{}') into got from jsonb_array_elements(p_items) value;
  if cardinality(expected) <> cardinality(got) or exists (
    select 1 from unnest(expected) e where not (e = any(got))
  ) or exists (select 1 from unnest(got) g where not (g = any(expected))) then
    return jsonb_build_object('code','invalid');
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if item->>'band' not in ('strong','partial','missed') or char_length(btrim(item->>'comment')) not between 1 and 800 then
      return jsonb_build_object('code','invalid');
    end if;
    insert into public.forge_v2_ratings(session_id, turn_id, band, comment)
    values (r.id, (item->>'turnId')::uuid, item->>'band', btrim(item->>'comment'));
  end loop;
  insert into public.forge_v2_ratings(session_id, turn_id, band, comment) values (r.id, null, null, btrim(p_summary));
  update public.forge_v2_sessions set state = 'complete', completed_at = clock_timestamp(), revision = revision + 1, updated_at = clock_timestamp()
    where id = r.id returning * into r;
  return jsonb_build_object('code','ok','session',to_jsonb(r));
end;
$$;

revoke all on function public.forge_v2_store_ratings(uuid, uuid, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.forge_v2_store_ratings(uuid, uuid, integer, text, jsonb) to service_role;

notify pgrst, 'reload schema';
