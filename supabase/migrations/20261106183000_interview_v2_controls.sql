-- Replace the spoken introduction, allow skipping it, and swap the current question
-- without recording an answer.
begin;

create or replace function public.forge_v2_save_intro(p_owner uuid, p_id uuid, p_revision integer, p_text text, p_first uuid) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.forge_v2_sessions;
begin
  select * into r from public.forge_v2_sessions where id = p_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('code','missing'); end if;
  if r.revision <> p_revision or r.state <> 'intro' then return jsonb_build_object('code','conflict'); end if;
  if p_text is null or char_length(btrim(p_text)) not between 1 and 4000 or p_first is null or not (p_first = any(r.planned_ids)) then
    return jsonb_build_object('code','invalid');
  end if;
  insert into public.forge_v2_turns(session_id, position, kind, prompt, student_text, skipped)
  values (r.id, 0, 'intro', 'First, please introduce yourself in about one minute.', btrim(p_text), false);
  update public.forge_v2_sessions set state = 'asking', current_question_id = p_first, current_reason = 'none',
    asked_ids = array[p_first], revision = revision + 1, updated_at = clock_timestamp()
    where id = r.id returning * into r;
  return jsonb_build_object('code','ok','session',to_jsonb(r));
end;
$$;

create function public.forge_v2_skip_intro(p_owner uuid, p_id uuid, p_revision integer, p_first uuid) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.forge_v2_sessions;
begin
  select * into r from public.forge_v2_sessions where id = p_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('code','missing'); end if;
  if r.revision <> p_revision or r.state <> 'intro' then return jsonb_build_object('code','conflict'); end if;
  if p_first is null or not (p_first = any(r.planned_ids)) then return jsonb_build_object('code','invalid'); end if;
  insert into public.forge_v2_turns(session_id, position, kind, prompt, student_text, skipped)
  values (r.id, 0, 'intro', 'First, please introduce yourself in about one minute.', null, true);
  update public.forge_v2_sessions set state = 'asking', current_question_id = p_first, current_reason = 'none',
    asked_ids = array[p_first], revision = revision + 1, updated_at = clock_timestamp()
    where id = r.id returning * into r;
  return jsonb_build_object('code','ok','session',to_jsonb(r));
end;
$$;

create function public.forge_v2_change_question(p_owner uuid, p_id uuid, p_revision integer, p_next uuid) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.forge_v2_sessions; asked uuid[];
begin
  select * into r from public.forge_v2_sessions where id = p_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('code','missing'); end if;
  if r.revision <> p_revision or r.state <> 'asking' or r.current_question_id is null then return jsonb_build_object('code','conflict'); end if;
  if p_next is null or p_next = r.current_question_id or not exists (
    select 1 from public.forge_v2_questions q where q.id = p_next and q.profile_id = r.profile_id and q.active
  ) then return jsonb_build_object('code','invalid'); end if;
  asked := r.asked_ids;
  if not (p_next = any(asked)) then asked := asked || p_next; end if;
  update public.forge_v2_sessions set current_question_id = p_next, current_reason = 'none',
    asked_ids = asked, revision = revision + 1, updated_at = clock_timestamp()
    where id = r.id returning * into r;
  return jsonb_build_object('code','ok','session',to_jsonb(r));
end;
$$;

revoke all on function public.forge_v2_skip_intro(uuid,uuid,integer,uuid) from public, anon, authenticated;
revoke all on function public.forge_v2_change_question(uuid,uuid,integer,uuid) from public, anon, authenticated;
grant execute on function public.forge_v2_skip_intro(uuid,uuid,integer,uuid) to service_role;
grant execute on function public.forge_v2_change_question(uuid,uuid,integer,uuid) to service_role;
commit;
