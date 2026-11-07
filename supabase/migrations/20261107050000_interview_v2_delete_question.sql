-- Past answers keep their saved prompt if the bank question is removed.
do $$
declare c name;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.forge_v2_turns'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%kind = ''intro''%';
  if c is not null then
    execute format('alter table public.forge_v2_turns drop constraint %I', c);
  end if;
  select conname into c from pg_constraint
  where conrelid = 'public.forge_v2_sessions'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%planned_ids%';
  if c is not null then
    execute format('alter table public.forge_v2_sessions drop constraint %I', c);
  end if;
end $$;

alter table public.forge_v2_turns
  add constraint forge_v2_turns_intro_has_no_question
  check (kind <> 'intro' or question_id is null);

alter table public.forge_v2_turns drop constraint if exists forge_v2_turns_question_id_fkey;
alter table public.forge_v2_turns
  add constraint forge_v2_turns_question_id_fkey
  foreign key (question_id) references public.forge_v2_questions(id) on delete set null;

alter table public.forge_v2_sessions
  add constraint forge_v2_sessions_planned_size
  check (cardinality(planned_ids) between 0 and 10);

create function public.forge_v2_delete_question(p_id uuid) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if p_id is null or not exists (select 1 from public.forge_v2_questions where id = p_id) then
    return jsonb_build_object('code','missing');
  end if;
  if exists (select 1 from public.forge_v2_sessions where state = 'asking' and current_question_id = p_id) then
    return jsonb_build_object('code','inUse');
  end if;
  update public.forge_v2_questions set related_ids = array_remove(related_ids, p_id) where p_id = any(related_ids);
  update public.forge_v2_sessions set planned_ids = array_remove(planned_ids, p_id) where p_id = any(planned_ids);
  delete from public.forge_v2_questions where id = p_id;
  return jsonb_build_object('code','ok');
end;
$$;

revoke all on function public.forge_v2_delete_question(uuid) from public, anon, authenticated;
grant execute on function public.forge_v2_delete_question(uuid) to service_role;

notify pgrst, 'reload schema';
