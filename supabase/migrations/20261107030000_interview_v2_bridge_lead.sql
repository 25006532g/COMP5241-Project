alter table public.forge_v2_sessions
  add column if not exists bridge_lead text;

alter table public.forge_v2_sessions
  drop constraint if exists forge_v2_sessions_bridge_lead_len;

alter table public.forge_v2_sessions
  add constraint forge_v2_sessions_bridge_lead_len
  check (bridge_lead is null or char_length(btrim(bridge_lead)) between 1 and 320);

drop function if exists public.forge_v2_save_answer(uuid, uuid, integer, text, boolean, uuid, text);

create function public.forge_v2_save_answer(
  p_owner uuid, p_id uuid, p_revision integer, p_text text, p_skipped boolean, p_next uuid, p_next_reason text, p_lead text default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.forge_v2_sessions; q public.forge_v2_questions; n integer; asked uuid[]; lead text;
begin
  select * into r from public.forge_v2_sessions where id = p_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('code','missing'); end if;
  if r.revision <> p_revision or r.state <> 'asking' or r.current_question_id is null then return jsonb_build_object('code','conflict'); end if;
  if p_skipped is null or (p_skipped and p_text is not null) or (not p_skipped and (p_text is null or char_length(btrim(p_text)) not between 1 and 4000)) then
    return jsonb_build_object('code','invalid');
  end if;
  select * into q from public.forge_v2_questions where id = r.current_question_id;
  if not found then return jsonb_build_object('code','conflict'); end if;
  select count(*) into n from public.forge_v2_turns where session_id = r.id;
  if n >= 11 or (p_next is not null and n + 1 >= 11) then return jsonb_build_object('code','invalid'); end if;
  if p_next is not null and (p_next_reason not in ('keyword','ai','none') or p_next = any(r.asked_ids) or not exists (
    select 1 from public.forge_v2_questions x where x.id = p_next and x.profile_id = r.profile_id and x.active
  )) then return jsonb_build_object('code','invalid'); end if;
  if p_next is null and p_next_reason is not null then return jsonb_build_object('code','invalid'); end if;
  lead := null;
  if p_next is not null and p_next_reason in ('keyword','ai') and p_lead is not null and char_length(btrim(p_lead)) between 1 and 320 then
    lead := btrim(p_lead);
  end if;
  insert into public.forge_v2_turns(session_id, position, kind, question_id, prompt, student_text, skipped, match_reason)
  values (r.id, n, 'question', q.id, q.prompt, case when p_skipped then null else btrim(p_text) end, p_skipped, r.current_reason);
  asked := r.asked_ids;
  if p_next is not null then asked := asked || p_next; end if;
  update public.forge_v2_sessions set
    state = case when p_next is null then 'rating' else 'asking' end,
    current_question_id = p_next,
    current_reason = case when p_next is null then null else p_next_reason end,
    bridge_lead = lead,
    asked_ids = asked, revision = revision + 1, updated_at = clock_timestamp()
    where id = r.id returning * into r;
  return jsonb_build_object('code','ok','session',to_jsonb(r));
end;
$$;

revoke all on function public.forge_v2_save_answer(uuid, uuid, integer, text, boolean, uuid, text, text) from public, anon, authenticated;
grant execute on function public.forge_v2_save_answer(uuid, uuid, integer, text, boolean, uuid, text, text) to service_role;

notify pgrst, 'reload schema';
