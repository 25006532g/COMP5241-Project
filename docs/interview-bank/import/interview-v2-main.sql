-- Interview simulator v2 for the main Supabase SQL editor.
-- This file creates the interview tables and then loads all 240 questions.
-- It does not copy users, sessions, answers, ratings, or API keys.
--
-- Paste this whole file into the SQL editor and run it once.
-- Leave the existing Supabase URL, anon key, service-role key, and OPENROUTER_API_KEY unchanged.
-- If interview v2 tables are already there, this file stops and changes nothing.


begin;

do $$
begin
  if to_regclass('public.forge_v2_questions') is not null then
    raise exception 'Interview v2 is already on this database. Skip this file.';
  end if;
end $$;

-- 20261106130000_interview_v2_ran.sql

-- Interview simulator v2. Separate from forge_interviews. Service role can read;
-- writes go through security-definer functions only.

create table public.forge_v2_profiles (
  id text primary key check (id in ('cs_degree','cs_master','software_engineer','frontend_engineer','backend_engineer','data_analyst')),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  interviewer text not null check (interviewer in ('professor','senior')),
  intro_rubric text not null check (char_length(btrim(intro_rubric)) between 1 and 2000)
);

insert into public.forge_v2_profiles(id, label, interviewer, intro_rubric) values
  ('cs_degree','Computer Science degree applicant','professor','A one-minute, name-free introduction for a computer science bachelor''s applicant: study interests, one course or project, and why this degree.'),
  ('cs_master','Computer Science master''s applicant','professor','A one-minute, name-free introduction for a computer science master''s applicant: preparation, a project, and why graduate study.'),
  ('software_engineer','Software engineer','senior','A one-minute, name-free introduction for a software engineer interview: focus, a project, and what kind of work they want.'),
  ('frontend_engineer','Frontend engineer','senior','A one-minute, name-free introduction for a frontend engineer interview: interface work, a project, and what they want to practice.'),
  ('backend_engineer','Backend engineer','senior','A one-minute, name-free introduction for a backend engineer interview: systems work, a project, and what they want to practice.'),
  ('data_analyst','Data analyst','senior','A one-minute, name-free introduction for a data analyst interview: data work, a project, and what they want to practice.');

create table public.forge_v2_questions (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.forge_v2_profiles(id),
  prompt text not null check (char_length(btrim(prompt)) between 1 and 2000),
  sample_answer text not null check (char_length(btrim(sample_answer)) between 1 and 4000),
  keywords text[] not null default '{}',
  related_ids uuid[] not null default '{}',
  kind text not null check (kind in ('primary','followup')),
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 1000),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table public.forge_v2_sessions (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null references public.forge_v2_profiles(id),
  state text not null check (state in ('intro','asking','rating','complete')),
  planned_ids uuid[] not null,
  asked_ids uuid[] not null default '{}',
  current_question_id uuid,
  current_reason text,
  revision integer not null default 1 check (revision between 1 and 1000),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  check (cardinality(planned_ids) between 7 and 10),
  check ((state = 'complete') = (completed_at is not null)),
  check ((state = 'asking') = (current_question_id is not null)),
  check ((current_question_id is null) = (current_reason is null)),
  check (current_reason is null or current_reason in ('keyword','ai','none'))
);

create table public.forge_v2_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.forge_v2_sessions(id) on delete cascade,
  position integer not null check (position between 0 and 10),
  kind text not null check (kind in ('intro','question')),
  question_id uuid references public.forge_v2_questions(id),
  prompt text not null check (char_length(btrim(prompt)) between 1 and 2000),
  student_text text,
  skipped boolean not null default false,
  match_reason text,
  unique (session_id, position),
  check ((kind = 'intro') = (question_id is null)),
  check (skipped = (student_text is null)),
  check (student_text is null or char_length(btrim(student_text)) between 1 and 4000),
  check (match_reason is null or match_reason in ('keyword','ai','none')),
  check (kind = 'question' or match_reason is null)
);

create table public.forge_v2_ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.forge_v2_sessions(id) on delete cascade,
  turn_id uuid references public.forge_v2_turns(id) on delete cascade,
  band text,
  comment text not null check (char_length(btrim(comment)) between 1 and 800),
  check ((turn_id is null) = (band is null)),
  check (band is null or band in ('strong','partial','missed'))
);
create unique index forge_v2_ratings_turn on public.forge_v2_ratings(session_id, turn_id) where turn_id is not null;
create unique index forge_v2_ratings_summary on public.forge_v2_ratings(session_id) where turn_id is null;

create table public.forge_v2_ai_usage (
  owner_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  used integer not null check (used between 1 and 20),
  primary key (owner_id, day)
);

create index forge_v2_questions_profile on public.forge_v2_questions(profile_id, active, kind);
create index forge_v2_sessions_owner on public.forge_v2_sessions(owner_id, created_at desc);
create index forge_v2_turns_session on public.forge_v2_turns(session_id, position);

create function public.forge_v2_keywords_ok(v text[]) returns boolean
language plpgsql immutable set search_path = pg_catalog, public as $$
declare k text;
begin
  if v is null or cardinality(v) > 12 then return false; end if;
  foreach k in array v loop
    if k is null or char_length(k) not between 1 and 40 or k <> btrim(k) then return false; end if;
  end loop;
  return (select count(distinct x) from unnest(v) x) = cardinality(v);
end;
$$;

create function public.forge_v2_question_guard() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare rel uuid; n integer;
begin
  if not public.forge_v2_keywords_ok(new.keywords) then raise exception 'invalid keywords'; end if;
  if new.related_ids is null or cardinality(new.related_ids) > 8 then raise exception 'invalid related'; end if;
  if new.id = any(new.related_ids) then raise exception 'self related'; end if;
  if (select count(distinct x) from unnest(new.related_ids) x) <> cardinality(new.related_ids) then raise exception 'duplicate related'; end if;
  foreach rel in array new.related_ids loop
    if not exists (select 1 from public.forge_v2_questions q where q.id = rel and q.profile_id = new.profile_id) then
      raise exception 'related profile';
    end if;
  end loop;
  if new.active then
    select count(*) into n from public.forge_v2_questions where profile_id = new.profile_id and active and id is distinct from new.id;
    if n >= 40 then raise exception 'question cap'; end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger forge_v2_questions_guard before insert or update on public.forge_v2_questions
  for each row execute function public.forge_v2_question_guard();

alter table public.forge_v2_profiles enable row level security;
alter table public.forge_v2_questions enable row level security;
alter table public.forge_v2_sessions enable row level security;
alter table public.forge_v2_turns enable row level security;
alter table public.forge_v2_ratings enable row level security;
alter table public.forge_v2_ai_usage enable row level security;

revoke all on public.forge_v2_profiles, public.forge_v2_questions, public.forge_v2_sessions, public.forge_v2_turns, public.forge_v2_ratings, public.forge_v2_ai_usage from public, anon, authenticated, service_role;
grant select on public.forge_v2_profiles, public.forge_v2_questions, public.forge_v2_sessions, public.forge_v2_turns, public.forge_v2_ratings to service_role;

create function public.forge_v2_claim_ai(p_owner uuid) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
declare n integer;
begin
  insert into public.forge_v2_ai_usage(owner_id, day, used)
  values (p_owner, (clock_timestamp() at time zone 'utc')::date, 1)
  on conflict (owner_id, day) do update
    set used = public.forge_v2_ai_usage.used + 1
    where public.forge_v2_ai_usage.used < 20
  returning used into n;
  return n is not null;
end;
$$;

create function public.forge_v2_save_rubric(p_profile text, p_rubric text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if p_rubric is null or char_length(btrim(p_rubric)) not between 1 and 2000 then return jsonb_build_object('code','invalid'); end if;
  update public.forge_v2_profiles set intro_rubric = btrim(p_rubric) where id = p_profile;
  if not found then return jsonb_build_object('code','missing'); end if;
  return jsonb_build_object('code','ok');
end;
$$;

create function public.forge_v2_save_question(
  p_id uuid, p_profile text, p_prompt text, p_sample text, p_keywords text[], p_related uuid[], p_kind text, p_active boolean, p_sort integer
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare existing public.forge_v2_questions; n integer;
begin
  if p_id is null or p_prompt is null or p_sample is null or p_kind not in ('primary','followup') or p_active is null
     or p_sort is null or p_sort not between 0 and 1000
     or char_length(btrim(p_prompt)) not between 1 and 2000
     or char_length(btrim(p_sample)) not between 1 and 4000
     or not public.forge_v2_keywords_ok(coalesce(p_keywords,'{}'))
     or p_related is null or cardinality(p_related) > 8
     or p_id = any(p_related)
     or (select count(distinct x) from unnest(p_related) x) <> cardinality(p_related)
     or p_profile not in ('cs_degree','cs_master','software_engineer','frontend_engineer','backend_engineer','data_analyst') then
    return jsonb_build_object('code','invalid');
  end if;
  if exists (select 1 from unnest(p_related) rel where not exists (
    select 1 from public.forge_v2_questions q where q.id = rel and q.profile_id = p_profile
  )) then return jsonb_build_object('code','invalid'); end if;
  select * into existing from public.forge_v2_questions where id = p_id;
  if found and existing.profile_id <> p_profile then return jsonb_build_object('code','conflict'); end if;
  select count(*) into n from public.forge_v2_questions where profile_id = p_profile and active and id is distinct from p_id;
  if p_active and n >= 40 then return jsonb_build_object('code','limit'); end if;
  insert into public.forge_v2_questions(id, profile_id, prompt, sample_answer, keywords, related_ids, kind, active, sort_order)
  values (p_id, p_profile, btrim(p_prompt), btrim(p_sample), coalesce(p_keywords,'{}'), coalesce(p_related,'{}'), p_kind, p_active, p_sort)
  on conflict (id) do update set prompt = excluded.prompt, sample_answer = excluded.sample_answer, keywords = excluded.keywords,
    related_ids = excluded.related_ids, kind = excluded.kind, active = excluded.active, sort_order = excluded.sort_order;
  return jsonb_build_object('code','ok');
end;
$$;

create function public.forge_v2_import_questions(p_profile text, p_questions jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare item jsonb; k text; rel text; keys text[] := '{}'; qid uuid; mapping jsonb := '{}'::jsonb; related uuid[]; active_count integer; ord integer := 0; kw text[];
begin
  if p_profile not in ('cs_degree','cs_master','software_engineer','frontend_engineer','backend_engineer','data_analyst')
     or p_questions is null or jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) not between 1 and 40 then
    return jsonb_build_object('code','invalid');
  end if;
  select count(*) into active_count from public.forge_v2_questions where profile_id = p_profile and active;
  if active_count + jsonb_array_length(p_questions) > 40 then return jsonb_build_object('code','limit'); end if;
  for item in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(item) <> 'object' or (select count(*) from jsonb_object_keys(item)) <> 6
       or not (item ?& array['key','kind','prompt','sampleAnswer','keywords','relatedKeys']) then
      return jsonb_build_object('code','invalid');
    end if;
    k := item->>'key';
    if k is null or k !~ '^[a-z0-9][a-z0-9-]{0,39}$' or k = any(keys) or item->>'kind' not in ('primary','followup') then
      return jsonb_build_object('code','invalid');
    end if;
    keys := array_append(keys, k);
    if jsonb_typeof(item->'prompt') <> 'string' or jsonb_typeof(item->'sampleAnswer') <> 'string'
       or char_length(btrim(item->>'prompt')) not between 1 and 2000
       or char_length(btrim(item->>'sampleAnswer')) not between 1 and 4000
       or jsonb_typeof(item->'keywords') <> 'array' or jsonb_typeof(item->'relatedKeys') <> 'array'
       or jsonb_array_length(item->'keywords') > 12 or jsonb_array_length(item->'relatedKeys') > 8 then
      return jsonb_build_object('code','invalid');
    end if;
    if exists (select 1 from jsonb_array_elements(item->'keywords') e where jsonb_typeof(e) <> 'string')
       or exists (select 1 from jsonb_array_elements(item->'relatedKeys') e where jsonb_typeof(e) <> 'string') then
      return jsonb_build_object('code','invalid');
    end if;
    kw := '{}';
    if jsonb_array_length(item->'keywords') > 0 then
      select array_agg(value) into kw from jsonb_array_elements_text(item->'keywords') value;
    end if;
    if not public.forge_v2_keywords_ok(kw) then return jsonb_build_object('code','invalid'); end if;
    if (select count(distinct value) from jsonb_array_elements_text(item->'relatedKeys') value) <> jsonb_array_length(item->'relatedKeys') then
      return jsonb_build_object('code','invalid');
    end if;
  end loop;
  for item in select value from jsonb_array_elements(p_questions) loop
    for rel in select value from jsonb_array_elements_text(item->'relatedKeys') loop
      if rel = item->>'key' or not (rel = any(keys)) then return jsonb_build_object('code','invalid'); end if;
    end loop;
  end loop;
  for item in select value from jsonb_array_elements(p_questions) loop
    kw := '{}';
    if jsonb_array_length(item->'keywords') > 0 then
      select array_agg(value) into kw from jsonb_array_elements_text(item->'keywords') value;
    end if;
    insert into public.forge_v2_questions(profile_id, prompt, sample_answer, keywords, related_ids, kind, active, sort_order)
    values (p_profile, btrim(item->>'prompt'), btrim(item->>'sampleAnswer'), kw, '{}', item->>'kind', true, ord)
    returning id into qid;
    mapping := mapping || jsonb_build_object(item->>'key', qid);
    ord := ord + 1;
  end loop;
  for item in select value from jsonb_array_elements(p_questions) loop
    related := '{}';
    for rel in select value from jsonb_array_elements_text(item->'relatedKeys') loop
      related := related || array[(mapping->>rel)::uuid];
    end loop;
    update public.forge_v2_questions set related_ids = related where id = (mapping->>(item->>'key'))::uuid;
  end loop;
  return jsonb_build_object('code','ok','inserted', jsonb_array_length(p_questions));
end;
$$;

create function public.forge_v2_start(p_owner uuid, p_id uuid, p_profile text, p_planned uuid[]) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.forge_v2_sessions;
begin
  if p_owner is null or p_id is null or p_planned is null or cardinality(p_planned) not between 7 and 10
     or (select count(distinct x) from unnest(p_planned) x) <> cardinality(p_planned) then
    return jsonb_build_object('code','invalid');
  end if;
  if not exists (select 1 from auth.users where id = p_owner) then return jsonb_build_object('code','missing'); end if;
  if exists (select 1 from unnest(p_planned) x(id) where not exists (
    select 1 from public.forge_v2_questions q where q.id = x.id and q.profile_id = p_profile and q.active and q.kind = 'primary'
  )) then return jsonb_build_object('code','invalid'); end if;
  select * into r from public.forge_v2_sessions where id = p_id and owner_id = p_owner;
  if found then
    if r.profile_id = p_profile and r.planned_ids = p_planned then return jsonb_build_object('code','ok','session',to_jsonb(r)); end if;
    return jsonb_build_object('code','conflict');
  end if;
  insert into public.forge_v2_sessions(id, owner_id, profile_id, state, planned_ids)
  values (p_id, p_owner, p_profile, 'intro', p_planned) returning * into r;
  return jsonb_build_object('code','ok','session',to_jsonb(r));
end;
$$;

create function public.forge_v2_save_intro(p_owner uuid, p_id uuid, p_revision integer, p_text text, p_first uuid) returns jsonb
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
  values (r.id, 0, 'intro', 'Please introduce yourself. About one minute.', btrim(p_text), false);
  update public.forge_v2_sessions set state = 'asking', current_question_id = p_first, current_reason = 'none',
    asked_ids = array[p_first], revision = revision + 1, updated_at = clock_timestamp()
    where id = r.id returning * into r;
  return jsonb_build_object('code','ok','session',to_jsonb(r));
end;
$$;

create function public.forge_v2_save_answer(
  p_owner uuid, p_id uuid, p_revision integer, p_text text, p_skipped boolean, p_next uuid, p_next_reason text
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.forge_v2_sessions; q public.forge_v2_questions; n integer; asked uuid[];
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
  insert into public.forge_v2_turns(session_id, position, kind, question_id, prompt, student_text, skipped, match_reason)
  values (r.id, n, 'question', q.id, q.prompt, case when p_skipped then null else btrim(p_text) end, p_skipped, r.current_reason);
  asked := r.asked_ids;
  if p_next is not null then asked := asked || p_next; end if;
  update public.forge_v2_sessions set
    state = case when p_next is null then 'rating' else 'asking' end,
    current_question_id = p_next,
    current_reason = case when p_next is null then null else p_next_reason end,
    asked_ids = asked, revision = revision + 1, updated_at = clock_timestamp()
    where id = r.id returning * into r;
  return jsonb_build_object('code','ok','session',to_jsonb(r));
end;
$$;

create function public.forge_v2_end(p_owner uuid, p_id uuid, p_revision integer) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.forge_v2_sessions;
begin
  select * into r from public.forge_v2_sessions where id = p_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('code','missing'); end if;
  if r.state in ('rating','complete') then return jsonb_build_object('code','ok','session',to_jsonb(r)); end if;
  if r.revision <> p_revision or r.state not in ('intro','asking') then return jsonb_build_object('code','conflict'); end if;
  update public.forge_v2_sessions set state = 'rating', current_question_id = null, current_reason = null,
    revision = revision + 1, updated_at = clock_timestamp()
    where id = r.id returning * into r;
  return jsonb_build_object('code','ok','session',to_jsonb(r));
end;
$$;

create function public.forge_v2_store_ratings(p_owner uuid, p_id uuid, p_revision integer, p_summary text, p_items jsonb) returns jsonb
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
    if item->>'band' not in ('strong','partial','missed') or char_length(btrim(item->>'comment')) not between 1 and 400 then
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

create function public.forge_v2_complete_unrated(p_owner uuid, p_id uuid, p_revision integer) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.forge_v2_sessions;
begin
  select * into r from public.forge_v2_sessions where id = p_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('code','missing'); end if;
  if r.state = 'complete' then return jsonb_build_object('code','ok','session',to_jsonb(r)); end if;
  if r.revision <> p_revision or r.state <> 'rating' then return jsonb_build_object('code','conflict'); end if;
  if exists (select 1 from public.forge_v2_ratings where session_id = r.id) then return jsonb_build_object('code','conflict'); end if;
  update public.forge_v2_sessions set state = 'complete', completed_at = clock_timestamp(), revision = revision + 1, updated_at = clock_timestamp()
    where id = r.id returning * into r;
  return jsonb_build_object('code','ok','session',to_jsonb(r));
end;
$$;

revoke all on function public.forge_v2_keywords_ok(text[]) from public, anon, authenticated;
revoke all on function public.forge_v2_question_guard() from public, anon, authenticated;
revoke all on function public.forge_v2_claim_ai(uuid) from public, anon, authenticated;
revoke all on function public.forge_v2_save_rubric(text,text) from public, anon, authenticated;
revoke all on function public.forge_v2_save_question(uuid,text,text,text,text[],uuid[],text,boolean,integer) from public, anon, authenticated;
revoke all on function public.forge_v2_import_questions(text,jsonb) from public, anon, authenticated;
revoke all on function public.forge_v2_start(uuid,uuid,text,uuid[]) from public, anon, authenticated;
revoke all on function public.forge_v2_save_intro(uuid,uuid,integer,text,uuid) from public, anon, authenticated;
revoke all on function public.forge_v2_save_answer(uuid,uuid,integer,text,boolean,uuid,text) from public, anon, authenticated;
revoke all on function public.forge_v2_end(uuid,uuid,integer) from public, anon, authenticated;
revoke all on function public.forge_v2_store_ratings(uuid,uuid,integer,text,jsonb) from public, anon, authenticated;
revoke all on function public.forge_v2_complete_unrated(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.forge_v2_claim_ai(uuid) to service_role;
grant execute on function public.forge_v2_save_rubric(text,text) to service_role;
grant execute on function public.forge_v2_save_question(uuid,text,text,text,text[],uuid[],text,boolean,integer) to service_role;
grant execute on function public.forge_v2_import_questions(text,jsonb) to service_role;
grant execute on function public.forge_v2_start(uuid,uuid,text,uuid[]) to service_role;
grant execute on function public.forge_v2_save_intro(uuid,uuid,integer,text,uuid) to service_role;
grant execute on function public.forge_v2_save_answer(uuid,uuid,integer,text,boolean,uuid,text) to service_role;
grant execute on function public.forge_v2_end(uuid,uuid,integer) to service_role;
grant execute on function public.forge_v2_store_ratings(uuid,uuid,integer,text,jsonb) to service_role;
grant execute on function public.forge_v2_complete_unrated(uuid,uuid,integer) to service_role;

-- 20261106183000_interview_v2_controls.sql

-- Replace the spoken introduction, allow skipping it, and swap the current question
-- without recording an answer.

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

-- 20261107010000_interview_v2_longer_comments.sql

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

-- 20261107020000_interview_v2_intro_strategy.sql

-- Replace short intro rubrics with Present/Past/Future suggested strategies.
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (courses, labs, or computing interests you focus on now).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (a course project, hackathon, or assignment result).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (why this degree or programme fits what you want to learn next).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'cs_degree';
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (your preparation and the graduate topic you are pursuing).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (an undergrad or industry project with a measurable outcome).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (why master''s study and this research or course direction).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'cs_master';
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (the product area or stack you work in most).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (shipping a feature, fixing reliability, or cutting delivery time).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (the kind of engineering problems you want on this team).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'software_engineer';
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (UI, accessibility, or client performance work you own day to day).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (improving UX metrics, load time, or design-system adoption).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (the frontend craft and product experience you want to grow here).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'frontend_engineer';
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (APIs, data, or services you design and operate).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (latency, throughput, reliability, or cost improvements).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (the systems and scale challenges you want to take on here).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'backend_engineer';
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (the data domains, tools, or stakeholders you support).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (a dashboard, model, or analysis that changed a decision).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (the questions and decisions you want to help this team answer).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'data_analyst';

-- 20261107030000_interview_v2_bridge_lead.sql

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

-- 20261107040000_interview_v2_delete_session.sql

create function public.forge_v2_delete_session(p_owner uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare removed uuid;
begin
  delete from public.forge_v2_sessions where id = p_id and owner_id = p_owner returning id into removed;
  if removed is null then return jsonb_build_object('code','missing'); end if;
  return jsonb_build_object('code','ok');
end;
$$;

revoke all on function public.forge_v2_delete_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.forge_v2_delete_session(uuid, uuid) to service_role;

notify pgrst, 'reload schema';

-- 20261107050000_interview_v2_delete_question.sql

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

-- question bank

update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (APIs, data, or services you design and operate).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (latency, throughput, reliability, or cost improvements).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (the systems and scale challenges you want to take on here).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'backend_engineer';
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (courses, labs, or computing interests you focus on now).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (a course project, hackathon, or assignment result).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (why this degree or programme fits what you want to learn next).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'cs_degree';
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (your preparation and the graduate topic you are pursuing).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (an undergrad or industry project with a measurable outcome).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (why master''s study and this research or course direction).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'cs_master';
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (the data domains, tools, or stakeholders you support).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (a dashboard, model, or analysis that changed a decision).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (the questions and decisions you want to help this team answer).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'data_analyst';
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (UI, accessibility, or client performance work you own day to day).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (improving UX metrics, load time, or design-system adoption).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (the frontend craft and product experience you want to grow here).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'frontend_engineer';
update public.forge_v2_profiles set intro_rubric = 'Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.

1. Present — Identity & current focus
• Greeting & name: "Good morning/afternoon, I am [Name]."
• Current role/status: your title, company, or major field of study.
• Core hook: one sentence on your primary expertise or day-to-day work (the product area or stack you work in most).

2. Past — Credibility & quantifiable impact
• Proven results: one concrete outcome with a number when you can (shipping a feature, fixing reliability, or cutting delivery time).
• Key strengths: the capabilities you used to get that result.

3. Future — Alignment & the pivot
• The match: genuine interest in this role/programme (the kind of engineering problems you want on this team).
• Value proposition: how your background helps their needs.
• Closing: hand the conversation back (for example, "Happy to go deeper on any of that.").

Aim for about one minute (~100–130 words) covering all three parts.' where id = 'software_engineer';

insert into public.forge_v2_questions (id, profile_id, prompt, sample_answer, keywords, related_ids, kind, active, sort_order)
values
  ('797f09b1-be8f-4873-b0e6-a94174e4ad5d'::uuid, 'backend_engineer', 'Why backend engineering, and what problems do you enjoy owning?', 'Describe preference for APIs, data integrity, reliability, and scale. Cite a service you built (auth, payments, data pipeline) and the hard part (consistency, latency).

Align with the team’s domain (commerce, messaging, infra).', ARRAY['reliability','ownership','latency','scale','backend']::text[], ARRAY[]::uuid[], 'primary', true, 0),
  ('6243cc79-6d99-4e0b-9f46-a5de8523d742'::uuid, 'backend_engineer', 'Tell me about a time you improved reliability or reduced incidents for a service.', 'STAR with SLOs, before/after error rates or MTTR, and concrete changes (timeouts, retries with jitter, circuit breakers, better alerts).

Show on-call empathy.', ARRAY['incident','reliability','mitigation','rollback','oncall']::text[], ARRAY[]::uuid[], 'primary', true, 1),
  ('9add3916-26ae-49e0-af67-9a68225ccb57'::uuid, 'backend_engineer', 'Describe a time you had to make a data model or API change that affected clients.', 'Explain versioning strategy, backwards compatibility, migration plan, communication, and monitoring during rollout.

Contract stewardship is core backend craft.', ARRAY['migration','client','version','compatibility','contract']::text[], ARRAY[]::uuid[], 'primary', true, 2),
  ('eaaf8175-7d61-4547-bbdc-3eed7f4a5e84'::uuid, 'backend_engineer', 'How do you design a REST API for pagination?', 'Prefer cursor/keyset pagination over fragile offset for large datasets. Define limit, opaque cursor, stable sort keys, and consistent filters.

Discuss total counts as optional expensive fields.', ARRAY['pagination','cursor','offset','limit','consistent']::text[], ARRAY[]::uuid[], 'primary', true, 3),
  ('761bc4e1-3442-4f81-b439-f255763b5724'::uuid, 'backend_engineer', 'REST vs gRPC vs GraphQL—when would you choose each on the backend?', 'REST: broad ecosystem, HTTP caching. gRPC: efficient internal service meshes, strong schemas. GraphQL: flexible client queries with cost controls.

Discuss operational complexity and team skills.', ARRAY['grpc','graphql','protobuf','latency','schema']::text[], ARRAY[]::uuid[], 'primary', true, 4),
  ('06c1ab9b-ad01-4d1a-b53c-84ede6b2cb04'::uuid, 'backend_engineer', 'What are webhooks, and how do you make webhook delivery reliable?', 'Webhooks notify external systems of events via HTTP callbacks. Reliability: retries with backoff, signatures for authenticity, idempotent receivers, and dead-letter queues.

Document delivery guarantees clearly.', ARRAY['webhook','retry','signature','delivery','idempotent']::text[], ARRAY[]::uuid[], 'primary', true, 5),
  ('c480325a-990a-4ce2-bac3-f3e01b57df31'::uuid, 'backend_engineer', 'Explain idempotency keys for payment or mutating APIs.', 'Client sends a unique key per logical operation; server stores first result and replays it on retries—preventing double charges after timeouts.

Cover key TTL, concurrency, and scope (per user/endpoint).', ARRAY['idempotency','payment','retry','duplicate','key']::text[], ARRAY[]::uuid[], 'primary', true, 6),
  ('9f111241-1cac-4eb4-8f26-eac96fe2374c'::uuid, 'backend_engineer', 'How do you approach database schema design for a new feature?', 'Start from access patterns, entities/relationships, keys/indexes, constraints, and migration strategy. Consider read/write ratio and future scale.

Normalize first; denormalize with measured cause.', ARRAY['schema','normalization','migration','constraint','index']::text[], ARRAY[]::uuid[], 'primary', true, 7),
  ('c47c109c-d492-4c1b-bffb-eb180e47b7a8'::uuid, 'backend_engineer', 'Explain isolation levels and a scenario for choosing one.', 'Read committed vs repeatable read vs serializable trade concurrency for anomaly prevention. Example: inventory reservation may need stronger isolation or careful locking.

Mention ORM defaults can surprise.', ARRAY['isolation','serializable','phantom','transaction','repeatable']::text[], ARRAY[]::uuid[], 'primary', true, 8),
  ('ab2b0cab-77ac-4ee2-9670-6415d54adccf'::uuid, 'backend_engineer', 'Optimistic vs pessimistic locking—when each?', 'Optimistic: version checks, good for low contention. Pessimistic: row locks, good for high contention critical sections. Ticketing/seat booking often discussed.

Explain user experience under conflicts.', ARRAY['optimistic','pessimistic','lock','conflict','version']::text[], ARRAY[]::uuid[], 'primary', true, 9),
  ('76d1a02c-c8b3-4714-985a-42f5e9c60199'::uuid, 'backend_engineer', 'How do connection pools work, and what failures occur when misconfigured?', 'Pools reuse DB connections to avoid setup overhead. Too small → latency; too large → DB overload. Discuss timeouts, leak detection, and serverless challenges.

Relate to production incident if possible.', ARRAY['pool','timeout','connection','exhaustion','latency']::text[], ARRAY[]::uuid[], 'primary', true, 10),
  ('219c7155-a525-4e52-ac92-9835b1dcd03c'::uuid, 'backend_engineer', 'SQL vs NoSQL for a high-write event log with simple key lookups?', 'Often append-optimized stores or partitioned logs; relational may still work at moderate scale with careful indexing. Emphasize query patterns and retention.

Avoid absolutism; propose measurement.', ARRAY['nosql','relational','event','lookup','write']::text[], ARRAY[]::uuid[], 'primary', true, 11),
  ('40672f52-723d-494d-81e0-563503b2d60e'::uuid, 'backend_engineer', 'How do you design indexes for a slow query?', 'Read EXPLAIN, match WHERE/JOIN/ORDER BY columns, consider composite index order, selectivity, and write amplification. Cover covering indexes and bloat.

Validate with production-like data volumes.', ARRAY['index','selectivity','covering','query','explain']::text[], ARRAY[]::uuid[], 'primary', true, 12),
  ('53cc42ba-51f3-4dcb-ba44-237c3fe28236'::uuid, 'backend_engineer', 'Design a URL shortener focused on backend concerns.', 'ID generation (hash vs counter + base62), datastore, cache, redirect path, analytics pipeline, and abuse controls. Discuss collision handling and multi-region.

Capacity estimates optional but valued.', ARRAY['shortener','redirect','cache','collision','shard']::text[], ARRAY[]::uuid[], 'primary', true, 13),
  ('61e8eb85-b69f-4411-937b-6deddd430504'::uuid, 'backend_engineer', 'Design a rate limiter for a multi-node API tier.', 'Token bucket/sliding window in Redis, consistent keying, local+global limits, and fail-open vs fail-closed policy. Discuss clock skew and fairness.

Return standard 429 semantics.', ARRAY['limiter','bucket','distributed','fairness','quota']::text[], ARRAY[]::uuid[], 'primary', true, 14),
  ('0666ef86-d53b-4067-888f-aa8338951974'::uuid, 'backend_engineer', 'How would you design a distributed task scheduler?', 'Requirements: delayed jobs, retries, at-least-once execution, leases/visibility timeouts, and dead letters. Discuss partitioning and exactly-once illusions.

Mention idempotent consumers.', ARRAY['scheduler','queue','retry','lease','worker']::text[], ARRAY[]::uuid[], 'primary', true, 15),
  ('a305e34e-67db-4b5a-9fb2-444850d4e20c'::uuid, 'backend_engineer', 'Explain caching strategies (cache-aside, write-through) and invalidation pitfalls.', 'Cache-aside common for read-heavy apps; write-through/write-behind variants. Pitfalls: stampede, stale data, thundering herd—mitigate with locks, jittered TTL, and explicit invalidation.

Measure hit rate.', ARRAY['cache','invalidation','ttl','stale','aside']::text[], ARRAY[]::uuid[], 'primary', true, 16),
  ('4a18e258-c485-40e6-bf32-d127c844755e'::uuid, 'backend_engineer', 'When do you introduce a message queue between services?', 'Use queues to absorb spikes, decouple producers/consumers, and enable async workflows. Discuss ordering, poison messages, and dual-write problems.

Not every sync call should become async.', ARRAY['queue','async','decoupling','retry','consumer']::text[], ARRAY[]::uuid[], 'primary', true, 17),
  ('a6d85ade-fb0c-41b9-aefc-2d3bf02dc777'::uuid, 'backend_engineer', 'How do you define SLIs/SLOs for a user-facing API?', 'Pick user-centric SLIs (availability, latency percentiles, error ratio). Set SLOs with error budgets guiding release velocity. Alert on symptoms, not only causes.

Give example numbers thoughtfully.', ARRAY['latency','availability','error','budget','objective']::text[], ARRAY[]::uuid[], 'primary', true, 18),
  ('99dfc90a-ed26-444c-8896-72a7d6ecff7c'::uuid, 'backend_engineer', 'Explain retry strategies and why naive retries are dangerous.', 'Use capped exponential backoff with jitter; only retry idempotent/safe operations; respect Retry-After; add circuit breakers. Naive retries amplify outages.

Correlate with load-shedding.', ARRAY['retry','backoff','jitter','timeout','storm']::text[], ARRAY[]::uuid[], 'primary', true, 19),
  ('9b998b94-02fa-404d-97ba-e48c2d270790'::uuid, 'backend_engineer', 'How do you approach horizontal sharding of a relational database?', 'Choose shard key by access pattern, avoid hotspots, plan cross-shard queries carefully, and design resharding strategy. Discuss lookup services and secondary indexes.

Start with vertical + read replicas if sufficient.', ARRAY['shard','rebalance','hotspot','relational','key']::text[], ARRAY[]::uuid[], 'primary', true, 20),
  ('5ff80341-3d90-4d4c-a568-71838e846a34'::uuid, 'backend_engineer', 'What is backpressure, and how do you implement it in a pipeline?', 'Backpressure signals consumers are overrun—slow producers, buffer with limits, drop/sample with policy, or autoscale. Unbounded queues hide problems until OOM.

Example: log ingestion.', ARRAY['backpressure','queue','bounded','slow','consumer']::text[], ARRAY[]::uuid[], 'primary', true, 21),
  ('61346069-f504-4d4a-9b73-a1655095d27a'::uuid, 'backend_engineer', 'How do you store passwords and design authentication sessions securely?', 'Hash passwords with modern KDFs (Argon2/bcrypt), never reverse; use secure cookies/httpOnly; rotate refresh tokens; protect against CSRF/XSS; consider MFA.

Discuss OAuth when integrating IdPs.', ARRAY['password','hash','session','cookie','token']::text[], ARRAY[]::uuid[], 'primary', true, 22),
  ('df17d246-fe50-4981-b0ea-8c4e46339eb7'::uuid, 'backend_engineer', 'What is the OWASP Top vulnerability class you watch for in APIs?', 'Discuss broken access control / IDOR: always authorize on resource ownership server-side. Mention injection, SSRF, and excessive data exposure.

Give a concrete check you perform in code review.', ARRAY['injection','authentication','authorization','exposure']::text[], ARRAY[]::uuid[], 'primary', true, 23),
  ('66a2b3a3-ab5f-4e18-ad62-ae32bb771840'::uuid, 'backend_engineer', 'How do you securely handle secrets in services?', 'Use a secret manager, short-lived credentials, least privilege IAM, no secrets in git/images, and rotation. Audit access.

Contrast with .env anti-patterns in production.', ARRAY['secret','vault','rotation','environment','credential']::text[], ARRAY[]::uuid[], 'primary', true, 24),
  ('6bfd148d-eb68-4642-a67b-9f606e6e52ca'::uuid, 'backend_engineer', 'How would you efficiently compute top-k frequently occurring events from a large log?', 'Hash counting if fits memory; otherwise count-min sketch / external sort / MapReduce style aggregation. Discuss accuracy trade-offs.

Relate to analytics pipelines.', ARRAY['heap','frequency','stream','count','memory']::text[], ARRAY[]::uuid[], 'primary', true, 25),
  ('47f678af-f903-445f-a53f-1d20411a501b'::uuid, 'backend_engineer', 'Explain consistent hashing and why it helps rebalancing.', 'Consistent hashing maps keys and nodes onto a ring so node add/remove moves fewer keys than modulo hashing. Virtual nodes improve balance.

Used in caches and distributed stores.', ARRAY['hashing','rebalance','vnode','ring','consistent']::text[], ARRAY[]::uuid[], 'primary', true, 26),
  ('1f63d15a-f8af-406a-995d-f63a090eec3a'::uuid, 'backend_engineer', 'How do you design APIs to be backwards compatible?', 'Additive changes preferred; avoid removing/renaming fields; use explicit versioning when breaking; expand-contract migrations for data.

Contract tests with consumers.', ARRAY['compatibility','version','deprecation','contract','client']::text[], ARRAY[]::uuid[], 'primary', true, 27),
  ('5aa891f9-e913-48d0-9cff-3824a35c373e'::uuid, 'backend_engineer', 'Explain transactions and when to use sagas instead of a single distributed transaction.', 'Local ACID transactions within one DB are ideal. Cross-service: sagas with compensating actions, because 2PC is operationally heavy.

Payment + inventory example.', ARRAY['saga','transaction','compensation','rollback','consistency']::text[], ARRAY[]::uuid[], 'primary', true, 28),
  ('c710e1ba-4b53-4da3-9e9a-23c5d81a22ef'::uuid, 'backend_engineer', 'Design a simplified payment authorization and capture flow—what can go wrong?', 'Idempotent authorize/capture, ledger entries, reconciliation, retries, and partial failures. Double-entry thinking helps auditability.

Emphasize exactly-once effects via idempotency + ledger.', ARRAY['authorization','capture','idempotency','refund','duplicate']::text[], ARRAY[]::uuid[], 'primary', true, 29),
  ('cf3aa920-a235-46cb-87ae-a69029e2267f'::uuid, 'backend_engineer', 'Tell me about a difficult production debugging story involving multiple services.', 'STAR using traces/logs/metrics across boundaries, hypothesis, mitigation, fix, and cross-team communication.

Distributed debugging skill signal.', ARRAY['tracing','logs','correlation','latency','dependency']::text[], ARRAY[]::uuid[], 'primary', true, 30),
  ('e917c694-d806-499d-a6e6-3bf9d22effd9'::uuid, 'backend_engineer', 'How do you load test a service before a major launch?', 'Define scenarios and SLOs, generate realistic traffic mixes, ramp gradually, watch saturation points, and fix bottlenecks iteratively. Include failure injection if mature.

Share capacity numbers carefully.', ARRAY['load','latency','throughput','saturation','bottleneck']::text[], ARRAY[]::uuid[], 'primary', true, 31),
  ('af5702a6-c707-4454-85ca-e653366c95d2'::uuid, 'backend_engineer', 'What is change data capture (CDC), and when is it useful?', 'CDC streams DB changes to downstream search indexes/analytics without dual writes. Discuss ordering, schema evolution, and lag.

Useful for event-driven architectures.', ARRAY['capture','stream','replication','outbox','change']::text[], ARRAY[]::uuid[], 'primary', true, 32),
  ('bda2e26d-0ae8-419e-bead-320723802854'::uuid, 'backend_engineer', 'How do you handle long-running requests or report generation?', 'Prefer async job + polling/webhook for completion; set timeouts on sync paths; store results in object storage; authorize download links.

Prevents worker pileups.', ARRAY['async','report','queue','worker','timeout']::text[], ARRAY[]::uuid[], 'primary', true, 33),
  ('93343656-1a76-42d3-a281-a9d365eee706'::uuid, 'backend_engineer', 'Explain SQL injection and how parameterized queries prevent it.', 'Untrusted input concatenated into SQL alters query structure. Parameter binding separates code from data. Also least-privilege DB users and input validation.

ORM ≠ automatic safety if raw SQL is used carelessly.', ARRAY['injection','parameterized','query','prepared','statement']::text[], ARRAY[]::uuid[], 'primary', true, 34),
  ('606a720e-b753-487f-b16f-61695f44708e'::uuid, 'backend_engineer', 'Which backend domain are you deepest in—data stores, APIs, or distributed systems—and what is your evidence?', 'Pick one with metrics and architecture decisions you owned. Name a growth area and how you learn (postmortems, books, labs).

Calibration question for interviewers.', ARRAY['datastore','distributed','latency','scale','evidence']::text[], ARRAY[]::uuid[], 'primary', true, 35),
  ('b54f0f5f-2c13-4aa3-ae9b-c1ce2416905a'::uuid, 'backend_engineer', 'How would you design search autocomplete backend components?', 'Prefix indexes/tries, caching popular prefixes, ranking, and freshness updates. Discuss personalization and abuse (scraping).

Latency budgets are tight.', ARRAY['autocomplete','prefix','trie','cache','suggestion']::text[], ARRAY[]::uuid[], 'primary', true, 36),
  ('393450d2-f686-435a-85a8-651119b8d932'::uuid, 'backend_engineer', 'Describe a time you said no to a feature request for reliability or security reasons.', 'Explain risk, proposed safer alternatives, stakeholder management, and eventual outcome. Courage + communication.

Error-budget thinking helps.', ARRAY['reliability','security','tradeoff','stakeholder','risk']::text[], ARRAY[]::uuid[], 'primary', true, 37),
  ('92845e95-0249-48be-93fa-1b037ac3d936'::uuid, 'backend_engineer', 'How do you find median latency from a large stream of request timings with limited memory?', 'Exact: external selection or two heaps for streaming median. Approximate: t-digest/HDR histograms common in metrics systems.

Connect algorithms to SRE dashboards.', ARRAY['median','quantile','reservoir','percentile','latency']::text[], ARRAY[]::uuid[], 'primary', true, 38),
  ('6326982e-1644-4513-bd0d-afe856e20930'::uuid, 'backend_engineer', 'What questions do you have about our service’s SLOs, on-call, or data stores?', 'Ask about error budgets, incident frequency, primary databases, migration history, and local ownership boundaries. Shows operational seriousness.

Tailor to what you heard in the interview.', ARRAY['oncall','objective','datastore','ownership','tooling']::text[], ARRAY[]::uuid[], 'primary', true, 39)
;

insert into public.forge_v2_questions (id, profile_id, prompt, sample_answer, keywords, related_ids, kind, active, sort_order)
values
  ('ce4004a3-cbba-4271-bdd5-8a3192b8a5a5'::uuid, 'cs_degree', 'Why do you want to study Computer Science at university?', 'Open with a concrete spark: a project, competition, course, or problem that made computing feel personally meaningful—not a generic “I like computers.” Connect that spark to what CS actually trains (abstraction, algorithms, systems thinking) rather than only consumer tech.

Then name 1–2 programme features you researched (labs, first-year foundation, AI/data electives, industry links) and say how they match your goals. Close with a near-term academic plan (e.g., build strong programming + discrete maths foundations in Year 1) and a longer-term direction you are curious about, while staying open to discovery.', ARRAY['computer','science','project','problem','university']::text[], ARRAY[]::uuid[], 'primary', true, 0),
  ('6ac487fb-8306-4f06-9141-21b4828493cc'::uuid, 'cs_degree', 'Tell me about yourself and what led you toward Computer Science.', 'Give a 45–60 second narrative: academic strengths → a defining CS-related experience → what you hope to explore next. Avoid listing every activity; pick two that show progression (e.g., self-taught Python → school robotics → a personal web app).

Highlight transferable traits interviewers listen for: curiosity, persistence when debugging, and communication. End by linking your story to why a CS bachelor’s programme is the logical next step.', ARRAY['programming','project','curiosity','problem','science']::text[], ARRAY[]::uuid[], 'primary', true, 1),
  ('41cd7e68-2a29-4820-a558-4e0569334597'::uuid, 'cs_degree', 'Why this university / this Computer Science programme specifically?', 'Show specific research: a course, lab, teaching style, dual-degree option, or student society—not rankings alone. Explain fit between your learning style and the programme structure (e.g., common foundation year then specialism).

Mention how you would contribute (clubs, peer mentoring, open-source, outreach). If interviewing for a scheme that covers multiple majors, explain why CS within that scheme is your intended path and what evidence supports readiness.', ARRAY['programme','course','faculty','research','campus']::text[], ARRAY[]::uuid[], 'primary', true, 2),
  ('9d1f4328-82eb-4f61-82da-24846b9d51a2'::uuid, 'cs_degree', 'What subjects interest you most, and how do they connect to Computer Science?', 'Pick 1–2 subjects with honest depth. For maths, mention discrete structures, proofs, or modelling; for physics/ICT, mention systems thinking or programming labs. Explain how those skills transfer to CS topics (algorithms, complexity, data representation).

Give a short example of applying another subject’s idea in a computing context (e.g., probability in game AI, geometry in graphics). Show intellectual range without claiming expertise you do not have.', ARRAY['mathematics','logic','programming','physics','subject']::text[], ARRAY[]::uuid[], 'primary', true, 3),
  ('86d35564-8426-4ec3-b9b9-0860448e64da'::uuid, 'cs_degree', 'Where do you see yourself in five to ten years, and how does a CS degree help?', 'Describe a plausible direction (software product engineering, data systems, cybersecurity, research pathway) while acknowledging UG study may refine it. Emphasize skills you expect to gain: rigorous problem decomposition, collaboration on large codebases, and ethical judgment about technology’s impact.

Avoid over-confident claims of founding a unicorn. Prefer “I want to be someone who can design reliable software for real users” plus one concrete milestone (internship, capstone, open-source contributions).', ARRAY['software','research','graduate','career','degree']::text[], ARRAY[]::uuid[], 'primary', true, 4),
  ('3027a2ad-e7d1-486b-aa6c-0e559cbba27b'::uuid, 'cs_degree', 'Which school subjects have prepared you best for CS, and why?', 'Discuss maths (logic, algebra, problem solving), ICT/CS if available, and any science with experimental method. Be specific: describe a hard problem you solved and the method (break into subproblems, test cases, revise approach).

If your school lacked CS courses, explain self-study or online courses and what you built. Admissions interviews value evidence of preparation more than perfect coursework access.', ARRAY['mathematics','programming','logic','project','subject']::text[], ARRAY[]::uuid[], 'primary', true, 5),
  ('daea4728-fc65-49f5-8ec6-01c304e01cab'::uuid, 'cs_degree', 'What is a favourite class you have taken, and what did you learn from it beyond the syllabus?', 'Choose a class where you can show depth: a proof that clicked, a programming lab that failed then worked, or a project that required independent reading. Explain the concept briefly in plain English.

Then reflect on learning habits gained (seeking help early, writing explanations, peer teaching). Interviewers often use favourite-class questions to probe intellectual vitality, not only grades.', ARRAY['project','concept','problem','curiosity','learned']::text[], ARRAY[]::uuid[], 'primary', true, 6),
  ('24ea662a-8a87-43b3-88cb-df7d0006e6bb'::uuid, 'cs_degree', 'How have you challenged yourself academically in the past two years?', 'Use STAR: Situation (demanding course/contest/project), Task (what success required), Action (study plan, tutoring, extra problems), Result (grade improvement, contest rank, working prototype) and a short learning.

Show agency: you chose difficulty intentionally. If results were mixed, focus on process upgrades you kept afterward.', ARRAY['challenge','mathematics','competition','project','course']::text[], ARRAY[]::uuid[], 'primary', true, 7),
  ('b79df4c4-1780-4bbb-8bf2-55aadd229c3e'::uuid, 'cs_degree', 'How comfortable are you with mathematics, and which topics feel strongest or weakest?', 'Be honest and specific. Strengths might be algebra, combinatorics basics, or coordinate geometry; weaknesses might be formal proofs or probability. Show a remediation plan (worked examples, tutoring, summer prep).

Link maths to CS: counting for complexity, graphs for networks, modular arithmetic for hashing. Confidence without arrogance is the goal.', ARRAY['algebra','calculus','proof','discrete','confidence']::text[], ARRAY[]::uuid[], 'primary', true, 8),
  ('45b784e5-8a8a-4873-9e12-64088bd9a949'::uuid, 'cs_degree', 'In plain language, what is an algorithm? Give a simple everyday example.', 'An algorithm is a finite, unambiguous sequence of steps that transforms inputs into outputs. Everyday example: sorting exam papers by student ID, or following a cooking recipe with clear stop conditions.

Then give a computing example: binary search on a sorted list—compare middle element, discard half—mention that clarity and termination matter. Avoid jargon dumps; show you can teach the idea.', ARRAY['algorithm','steps','recipe','sorting','repeat']::text[], ARRAY[]::uuid[], 'primary', true, 9),
  ('bdb2b666-53b4-4f74-9148-21c1b44132d0'::uuid, 'cs_degree', 'What is the difference between a program and a programming language?', 'A programming language is a formal notation with syntax and semantics used to express computations. A program is a particular set of instructions written in a language to solve a problem.

Analogy: English vs a specific essay. Mention that languages differ in abstraction (Python vs C) and that compilers/interpreters turn programs into machine-executable behaviour. Keep it accurate and short.', ARRAY['program','language','compiler','instruction','syntax']::text[], ARRAY[]::uuid[], 'primary', true, 10),
  ('e253580b-3913-48a5-b63c-7967f2fe591f'::uuid, 'cs_degree', 'Explain what a variable and a data type are, with examples.', 'A variable is a named storage location whose value can change during execution. A data type describes the kind of values and allowed operations (integers, floating-point numbers, strings, booleans).

Example: `score = 95` (integer) vs `name = "Jordan"` (string). Note that some languages are statically typed and others dynamically typed, but the idea of type constraints remains. Tie to why types prevent bugs.', ARRAY['variable','integer','string','memory','type']::text[], ARRAY[]::uuid[], 'primary', true, 11),
  ('a31e63c1-095b-4830-b981-26955cd24226'::uuid, 'cs_degree', 'What is the difference between compiling and interpreting a program?', 'Compilation translates source code into machine code (or bytecode) ahead of running, often catching many errors early and enabling optimization. Interpretation executes source (or bytecode) more directly, which can aid rapid iteration.

Modern languages blur the line (e.g., Java bytecode + JIT). For admissions, show you understand the trade-off: performance/early checking vs flexibility/speed of development.', ARRAY['compiler','interpreter','bytecode','source','machine']::text[], ARRAY[]::uuid[], 'primary', true, 12),
  ('5bdc17d3-9e8d-4e84-88bd-954692c0b821'::uuid, 'cs_degree', 'What does Big-O notation mean at a high level, and why might it matter?', 'Big-O describes how an algorithm’s time or space grows as input size grows, focusing on dominant growth (e.g., linear vs quadratic). It helps compare approaches before coding every detail.

Example: scanning a list once is roughly O(n); nested loops over the list can be O(n²). Emphasize that constants and real hardware matter too, but Big-O guides scalable thinking. Keep math light unless asked to deepen.', ARRAY['complexity','growth','input','scaling','algorithm']::text[], ARRAY[]::uuid[], 'primary', true, 13),
  ('18bf8ccc-4516-475d-bebf-873386dc5758'::uuid, 'cs_degree', 'Describe arrays (or lists) versus dictionaries (or maps). When would you use each?', 'Arrays/lists store ordered elements accessed by index—good for sequences and ordered traversal. Dictionaries/maps store key→value associations—good for fast lookups by name/ID.

Example: a list of daily temperatures vs a map from student ID to grade. Mention trade-offs: arrays have contiguous indexing; maps need good key design. Relate to a small project you built if possible.', ARRAY['array','dictionary','lookup','index','key']::text[], ARRAY[]::uuid[], 'primary', true, 14),
  ('de2f3455-a795-4b8e-b116-fe9af2cbb471'::uuid, 'cs_degree', 'Walk me through how you would approach a logic or puzzle problem you have not seen before.', 'State a method: (1) restate the problem and constraints, (2) try tiny examples by hand, (3) look for patterns or invariants, (4) propose a brute-force idea, (5) improve if needed, (6) check edge cases.

Verbalize assumptions and ask clarifying questions. Admissions interviewers often care more about structured thinking than the final trick. Mention staying calm and writing steps clearly.', ARRAY['constraint','pattern','example','check','brute']::text[], ARRAY[]::uuid[], 'primary', true, 15),
  ('32784c0c-ca21-4e45-a568-b7c6b2e1f7c8'::uuid, 'cs_degree', 'Describe a time you debugged a program or technical project that was not working.', 'STAR: Situation (what broke), Task (needed correct behaviour before a deadline), Action (reproduce bug, isolate with prints/tests, form hypothesis, fix, add regression check), Result (working feature + what you learned about systematic debugging).

Emphasize evidence over guessing. If you used AI tools, say how you verified outputs yourself—integrity matters.', ARRAY['reproduce','hypothesis','error','print','bug']::text[], ARRAY[]::uuid[], 'primary', true, 16),
  ('cecb1802-a8d1-4ba7-85f6-18ad9343eb9a'::uuid, 'cs_degree', 'How would you estimate how many searches a busy school library catalogue might handle in a day?', 'This is a Fermi/guesstimate: define assumptions (students, visits/day, searches per visit), multiply, and state uncertainty ranges. Speak your arithmetic aloud.

Then discuss what data you would collect to validate (logs, surveys). Show comfort with rough quantitative reasoning—useful for CS and for later systems thinking.', ARRAY['estimate','assumption','query','bound','student']::text[], ARRAY[]::uuid[], 'primary', true, 17),
  ('5258da48-f3a2-4fd6-8aed-6371b0d28016'::uuid, 'cs_degree', 'If you had to teach a younger student how to sort a list of numbers, how would you explain it?', 'Pick a simple method (e.g., selection sort or insertion sort) and explain with a short numeric example. Emphasize comparison and swapping, and that computers follow exact steps.

Optionally contrast with a faster idea at high level (divide-and-conquer) without claiming full merge-sort proofs. Teaching clarity signals mastery appropriate for UG interviews.', ARRAY['sorting','compare','swap','insertion','bubble']::text[], ARRAY[]::uuid[], 'primary', true, 18),
  ('26a8d5aa-ca98-4805-b811-bc1ba972b0e6'::uuid, 'cs_degree', 'Tell me about a computing project you built. What was your contribution?', 'Describe problem, users, tech stack at a high level, and your personal contribution if it was a team project. Include one hard decision (data model, UI, algorithm) and the outcome (demo, users, contest).

Show iteration: what you would improve next. Bring a portfolio link if allowed. Avoid buzzword lists without substance.', ARRAY['project','feature','contribution','demo','bug']::text[], ARRAY[]::uuid[], 'primary', true, 19),
  ('2ea14939-3d34-48cd-a54c-35483aa11da7'::uuid, 'cs_degree', 'How did you first get involved in programming, robotics, or another STEM activity?', 'Tell an origin story with a first “hello world” or club joining moment, then how involvement deepened. Mention people who helped (teacher, peers) and a milestone that raised standards for yourself.

Connect the activity to skills: teamwork, documentation, time management. Keep it authentic rather than polished marketing.', ARRAY['programming','robotics','club','project','curiosity']::text[], ARRAY[]::uuid[], 'primary', true, 20),
  ('883a4b04-ecd0-4fe6-af4e-1e3452ef90ee'::uuid, 'cs_degree', 'What is an achievement you are proud of that is not a test score?', 'Choose impact over prestige: mentoring classmates, building a tool for a community group, sustaining a long project. Use STAR and quantify if possible (hours, users, improvement).

Reflect on character traits shown (responsibility, creativity). Admissions interviews weigh contribution quality, not only trophies.', ARRAY['leadership','competition','community','proud','project']::text[], ARRAY[]::uuid[], 'primary', true, 21),
  ('12769718-2225-4e18-b1b7-78f5121abf4b'::uuid, 'cs_degree', 'Describe a time you worked in a team on a project. What role did you play?', 'STAR with clear personal actions: how you divided work, resolved a disagreement, integrated modules, and communicated status. Mention tools (shared docs, Git) if used.

Show you can both lead and follow. Result should include team outcome and a lesson about collaboration in technical work.', ARRAY['team','communication','deadline','contribution','role']::text[], ARRAY[]::uuid[], 'primary', true, 22),
  ('a95a92ec-e36f-4c2b-b338-d3fee641c22b'::uuid, 'cs_degree', 'Tell me about a disagreement with a teammate and how you handled it.', 'Focus on respect: listen to their constraint, share your evidence, seek a test or experiment to decide (prototype A/B, timer trial). Avoid villain narratives.

Result: better design or clearer split of responsibilities. Learning: document decisions early. This probes maturity for group projects in CS programmes.', ARRAY['disagreement','compromise','listen','decision','team']::text[], ARRAY[]::uuid[], 'primary', true, 23),
  ('54e67f36-8969-40f1-966f-b27042e92b32'::uuid, 'cs_degree', 'How would you explain a technical idea to someone without a CS background?', 'State the audience goal first, use analogy, then one concrete example, and check understanding. Example: explaining caching as “keeping frequently used notes on your desk instead of walking to the library.”

Mention avoiding unnecessary jargon and visual aids. Communication skill is explicitly valued in programme interviews conducted in English.', ARRAY['analogy','jargon','audience','simple','example']::text[], ARRAY[]::uuid[], 'primary', true, 24),
  ('4856d8ff-e25e-40e5-8556-c28ad7663554'::uuid, 'cs_degree', 'Tell me about a time you faced a significant challenge and how you responded.', 'Pick an academic or project challenge with stakes. STAR: diagnose the obstacle, actions taken (plan, seek help, practice), measurable result, and emotional regulation.

End with a lasting habit change. Authenticity beats dramatic fiction; interviewers probe follow-ups.', ARRAY['challenge','persistence','learned','plan','help']::text[], ARRAY[]::uuid[], 'primary', true, 25),
  ('521e74fd-1905-4a4e-b94d-af7894dbc5b6'::uuid, 'cs_degree', 'What are your greatest strengths and one area you are improving?', 'Choose strengths evidenced by stories (persistence in debugging, clear writing, maths). For improvement, pick a real, coachable area (public speaking, time estimates) and show actions already underway.

Never disguise a strength as a fake weakness. Balance confidence with humility.', ARRAY['strength','practice','feedback','weakness','communication']::text[], ARRAY[]::uuid[], 'primary', true, 26),
  ('80305d5b-7c68-4a61-8226-48a8aed9264b'::uuid, 'cs_degree', 'Describe a time you showed leadership without necessarily having a formal title.', 'Leadership can mean organizing study groups, setting coding standards, unblocking teammates, or escalating a risk early. STAR with impact on others.

Tie to how you would contribute on campus (peer helpers, club officers). Admissions seek initiative, not only titles.', ARRAY['leadership','initiative','organized','project','team']::text[], ARRAY[]::uuid[], 'primary', true, 27),
  ('eec57dc2-7e69-4d97-8b3d-72cbfb3988a2'::uuid, 'cs_degree', 'Tell me about a failure or mistake and what you learned.', 'Own the mistake without over-apologizing. Explain cause analysis, repair actions, and prevention (checklists, tests, earlier feedback). Show growth mindset.

Avoid blaming others or choosing a trivial “failure.” Interviewers use this to assess resilience and integrity.', ARRAY['mistake','learned','responsibility','feedback','retry']::text[], ARRAY[]::uuid[], 'primary', true, 28),
  ('4797a528-0ce9-4810-8929-0557037a1c3f'::uuid, 'cs_degree', 'What does academic honesty mean to you in programming courses?', 'Define honesty as submitting work that reflects your own understanding, properly acknowledging collaboration and sources, and following course collaboration policies.

Discuss grey areas: discussing approaches vs copying code; using generative AI for explanation vs submitting AI code as your own. Affirm you would ask instructors when unsure.', ARRAY['citation','honesty','plagiarism','credit','collaboration']::text[], ARRAY[]::uuid[], 'primary', true, 29),
  ('37e541d8-1b57-482e-b7ee-e3a2485ab311'::uuid, 'cs_degree', 'If a classmate asked to copy your assignment code the night before the deadline, what would you do?', 'Refuse copying, offer legitimate help (explain concepts, point to docs, suggest meeting the TA), and acknowledge deadline pressure without enabling misconduct.

Explain long-term harm: they miss learning, both risk disciplinary action, and trust erodes. Show empathy plus firmness—maturity signal for admissions.', ARRAY['deadline','honesty','explain','refuse','help']::text[], ARRAY[]::uuid[], 'primary', true, 30),
  ('185179b4-52f1-4418-a001-d2b9945a0c1f'::uuid, 'cs_degree', 'How should students use generative AI tools ethically when learning to code?', 'Propose a personal policy: use AI to explain errors and suggest approaches, but re-implement and understand every line you submit; never paste solutions blindly; disclose when required.

Compare to calculator use in maths: helpful after you know the method. Mention verifying outputs because AI can be wrong. Align with course rules first.', ARRAY['citation','assistant','disclosure','learning','honesty']::text[], ARRAY[]::uuid[], 'primary', true, 31),
  ('227e1a49-6879-4f07-a76e-e5011b0eb23b'::uuid, 'cs_degree', 'Give an example of a technology ethics issue that concerns you (privacy, bias, misinformation, etc.).', 'Pick one issue and explain stakeholders and harm concretely (e.g., facial recognition false matches). Suggest responsible design ideas (consent, audit, human oversight) at a level appropriate for UG applicants.

Show you see CS as socio-technical, not only coding. Avoid partisan ranting; stay analytical.', ARRAY['privacy','bias','misinformation','consent','data']::text[], ARRAY[]::uuid[], 'primary', true, 32),
  ('46bca7c9-cab3-48fa-a4d9-26a031d41bf6'::uuid, 'cs_degree', 'How do you usually prepare for a difficult exam or timed problem set?', 'Describe a concrete system: spaced practice, past papers under time, error log of mistakes, teaching a peer, sleep and schedule buffers.

Show metacognition—adjusting strategy after a midterm. Time management stories matter for demanding CS curricula.', ARRAY['practice','outline','timing','questions','exam']::text[], ARRAY[]::uuid[], 'primary', true, 33),
  ('51921879-b730-45c5-b905-19efedfa23b1'::uuid, 'cs_degree', 'What questions do you have for us about the CS programme?', 'Prepare 2–3 genuine questions: first-year project opportunities, research exposure for UGs, exchange, advising, or how students choose specialisms. Avoid questions answered clearly on the homepage.

Good questions show maturity and help you evaluate fit. Thank the interviewer and listen actively.', ARRAY['course','research','internship','faculty','support']::text[], ARRAY[]::uuid[], 'primary', true, 34),
  ('6867470d-3fe1-4a54-88f5-710a6eaf77cf'::uuid, 'cs_degree', 'What is the internet at a high level, and what happens roughly when you visit a website?', 'Explain layered picture simply: your device sends a request for a page; DNS helps find the server address; HTTP(S) fetches content; the browser renders HTML/CSS/JS.

Acknowledge simplification. Relating daily experience to systems concepts shows CS curiosity valued in admissions.', ARRAY['server','browser','packet','website','request']::text[], ARRAY[]::uuid[], 'primary', true, 35),
  ('5d9eccbf-c7e0-48d7-9e32-df9c972e98ae'::uuid, 'cs_degree', 'How do you balance academics with extracurricular activities?', 'Give a scheduling method (weekly plan, priority matrix, saying no). Share a time conflict you resolved and the outcome for grades and commitments.

Programmes want contributors who can sustain workload—not burnout stories without coping strategies.', ARRAY['schedule','priority','rest','club','study']::text[], ARRAY[]::uuid[], 'primary', true, 36),
  ('bd54d619-750e-4dc5-b03b-12e67dd2119f'::uuid, 'cs_degree', 'If admitted, how would you use your first year to build a strong CS foundation?', 'Outline concrete plan: master programming fundamentals, discrete maths, and study skills; join a coding club; complete small projects each term; seek help early via office hours.

Mention exploring subfields through seminars without over-specializing too soon. Shows intentionality aligned with scheme foundations.', ARRAY['foundation','mathematics','programming','project','course']::text[], ARRAY[]::uuid[], 'primary', true, 37),
  ('286e3dcb-0faf-4a5a-870d-4024459d9c70'::uuid, 'cs_degree', 'Describe a time you received critical feedback. What did you change?', 'STAR: feedback content, initial reaction managed professionally, specific changes (code style, presentation clarity, maths practice), and improved later result.

Emphasize gratitude and iteration—key for studio/project-based CS learning.', ARRAY['feedback','practice','improvement','specific','changed']::text[], ARRAY[]::uuid[], 'primary', true, 38),
  ('924d426d-908d-4362-a5d4-b97dda473a19'::uuid, 'cs_degree', 'What do you hope to contribute to the CS student community?', 'Name concrete contributions: peer study groups, diversity in STEM outreach, open-source, hackathon organizing, or documenting labs for juniors.

Tie contributions to skills you already practice. Admissions look for mutual benefit—what you gain and what you give.', ARRAY['community','tutoring','mentoring','club','project']::text[], ARRAY[]::uuid[], 'primary', true, 39)
;

insert into public.forge_v2_questions (id, profile_id, prompt, sample_answer, keywords, related_ids, kind, active, sort_order)
values
  ('12773583-f2e8-4273-b1a3-5e24924d4b5c'::uuid, 'cs_master', 'Why pursue a master''s degree in Computer Science now?', 'Explain the gap between your current skills and the problems you want to solve—advanced systems, ML engineering, research methods, or specialized coursework not covered deeply in your bachelor''s.

Distinguish MS goals from a second bachelor''s: greater depth, research or industry specialization, and readiness for ambiguous problems. Time the decision with evidence (projects, work experience, academic record) rather than only credential chasing.', ARRAY['research','specialization','graduate','depth','course']::text[], ARRAY[]::uuid[], 'primary', true, 0),
  ('2e6b90a7-1601-4101-a03b-a0b06cfeed52'::uuid, 'cs_master', 'Why this master''s programme, and how does it match your intended specialization?', 'Map programme tracks/courses/labs to your plan (e.g., systems, AI, security). Cite specific faculty themes or course sequences you reviewed, and prerequisites you already satisfy or will fill.

If the programme allows coursework-only vs research distinction, say which path you intend and why. Specificity beats flattery.', ARRAY['faculty','specialization','research','lab','course']::text[], ARRAY[]::uuid[], 'primary', true, 1),
  ('5e05e51b-dd96-4e6f-95b1-e6fb73ab3683'::uuid, 'cs_master', 'How will you contribute to the graduate cohort and department community?', 'Mention peer collaboration in advanced courses, reading groups, mentoring juniors, sharing industry experience, or organizing technical talks. Give evidence from prior leadership.

Show you understand graduate culture: seminars, office hours, collaborative problem sets, and respectful debate.', ARRAY['seminar','mentoring','collaboration','cohort','research']::text[], ARRAY[]::uuid[], 'primary', true, 2),
  ('cd4f4e09-74bc-4e74-92bb-715e906c6f45'::uuid, 'cs_master', 'Do you have a CS bachelor''s? If not, how have you built quantitative and programming foundations?', 'If CS major: summarize core completed (DSA, OS, networks, databases, discrete maths) and grades/projects as proof. If non-CS: list bridge courses, MOOCs with projects, work experience, and a coherent progression—not scattered certificates.

Stanford-style messaging: CS bachelor’s not always required, but strong quantitative/analytical skills are. Show a plan for any remaining gaps.', ARRAY['mathematics','programming','algorithms','foundation','course']::text[], ARRAY[]::uuid[], 'primary', true, 3),
  ('d23becbe-65ac-4d53-ade0-7a0be85b4e54'::uuid, 'cs_master', 'Which undergraduate courses most prepared you for graduate-level CS, and which were hardest?', 'Pick 2–3 demanding courses; explain concepts retained (e.g., amortized analysis, concurrency bugs, relational algebra). For hardest courses, show how you adapted study methods.

Connect preparation to the MS courses you want next. Honesty about struggle plus recovery is stronger than claiming everything was easy.', ARRAY['algorithms','systems','proof','project','course']::text[], ARRAY[]::uuid[], 'primary', true, 4),
  ('0624474d-5f10-444f-b2bb-7120c34b300e'::uuid, 'cs_master', 'How would you assess whether you are ready for graduate algorithms or systems courses?', 'Reference foundation checklists: data structures, proof-based reasoning, probability, systems programming, and ability to complete substantial projects independently.

Describe a recent self-test (re-implementing a textbook algorithm; reading a systems paper and summarizing). Show metacognitive readiness, not just GPA.', ARRAY['algorithms','systems','prerequisite','proof','gap']::text[], ARRAY[]::uuid[], 'primary', true, 5),
  ('af274ead-9bc7-4d01-b82e-9df2a1d92922'::uuid, 'cs_master', 'Describe a research or substantial independent project you completed. What was your contribution?', 'State problem, related work at a high level, method, your personal contribution, and evaluation metrics. Distinguish your work from teammates’.

Discuss what did not work and how you iterated. Even for coursework MS paths, research-like projects signal graduate readiness.', ARRAY['research','contribution','experiment','limitation','result']::text[], ARRAY[]::uuid[], 'primary', true, 6),
  ('34d2b908-85cf-4c72-afed-114e681fc92c'::uuid, 'cs_master', 'How do you formulate a research question from a vague real-world problem?', 'Describe a process: survey literature, identify a measurable gap, define scope and success metrics, choose a method (empirical, systems, theoretical), and plan threats to validity.

Give a mini example from your domain. Faculty interviewers look for taste in problem selection and feasibility.', ARRAY['hypothesis','literature','metric','scope','question']::text[], ARRAY[]::uuid[], 'primary', true, 7),
  ('e6446ea0-6720-4b1b-93b4-0073cda869b0'::uuid, 'cs_master', 'Tell us about a paper you read recently. What was the claim, method, and limitation?', 'Summarize in three layers: claim, evidence/method, and a critique (assumptions, baselines, scalability). Avoid name-dropping without understanding.

Explain what experiment you would run next. This probes research literacy for thesis-oriented MS tracks.', ARRAY['claim','method','limitation','paper','result']::text[], ARRAY[]::uuid[], 'primary', true, 8),
  ('f1c2b3da-93d9-4773-a1bb-dc7dc525526e'::uuid, 'cs_master', 'Are you aiming for industry after the MS, a PhD later, or still exploring? How does the MS help either path?', 'Be coherent: industry path → advanced engineering depth, systems/ML electives, internships; PhD path → research methods, faculty alignment, publications. If exploring, show how first-year coursework/research rotations will inform the decision.

Acknowledge that MS admission is not a guaranteed PhD bridge where that is true.', ARRAY['industry','doctorate','research','specialization','course']::text[], ARRAY[]::uuid[], 'primary', true, 9),
  ('3b5212e9-1512-42db-b23e-779eaba2b9ff'::uuid, 'cs_master', 'How would you choose a faculty advisor or research group?', 'Criteria: problem fit, advising style, publication/engineering norms, funding/timeline realism, and group culture. Describe how you would read recent papers, attend talks, and ask current students about mentoring.

Show respect for faculty time with informed questions.', ARRAY['advisor','publication','meeting','research','fit']::text[], ARRAY[]::uuid[], 'primary', true, 10),
  ('cf8e4771-f084-4827-88fd-7c73790ba39d'::uuid, 'cs_master', 'Explain time and space complexity for a graph algorithm you know well (e.g., BFS).', 'Define BFS on adjacency lists: O(V+E) time, O(V) auxiliary space for queue/visited. Mention when adjacency matrices change costs.

Discuss applications (shortest path in unweighted graphs) and pitfalls (disconnected graphs). Speak precisely; offer to deepen with a whiteboard example.', ARRAY['breadth','queue','complexity','graph','visit']::text[], ARRAY[]::uuid[], 'primary', true, 11),
  ('0eaa335f-398e-4086-9f91-f051b0b5fdaf'::uuid, 'cs_master', 'Compare hashing and balanced trees for dictionary ADTs. When do you prefer each?', 'Average O(1) hash table ops vs O(log n) balanced trees; trees keep ordered iteration and worse-case bounds; hashing needs good hash functions and load-factor management.

Discuss memory, cache behaviour, and key types. Graduate interviews expect trade-off language, not memorized APIs.', ARRAY['hashing','collision','balance','dictionary','tree']::text[], ARRAY[]::uuid[], 'primary', true, 12),
  ('2d721344-9a00-47ce-a593-8d2f3494ca04'::uuid, 'cs_master', 'What is dynamic programming, and when is it appropriate?', 'DP solves overlapping subproblems with optimal substructure by memoization or tabulation. Contrast with plain recursion that recomputes.

Example outline: coin change or edit distance—define state, transition, base cases, complexity. Mention when greedy suffices instead.', ARRAY['subproblem','memoization','recursion','optimal','overlapping']::text[], ARRAY[]::uuid[], 'primary', true, 13),
  ('342df559-c1a3-454b-97f7-d291c8abfef4'::uuid, 'cs_master', 'How do you reason about correctness for an algorithm (invariants, induction, testing)?', 'Describe loop invariants or inductive arguments for simple algorithms, plus empirical testing with edge cases and randomized tests.

For distributed/systems algorithms, mention model assumptions. Showing multiple lenses signals graduate maturity.', ARRAY['invariant','induction','counterexample','proof','testing']::text[], ARRAY[]::uuid[], 'primary', true, 14),
  ('d77151a6-61a7-46ac-913e-bb8be9007644'::uuid, 'cs_master', 'Explain processes vs threads and when you would use concurrency.', 'Processes isolate address spaces; threads share memory within a process, enabling cheaper context sharing but requiring synchronization.

Discuss race conditions, locks/deadlocks at a conceptual level, and when async IO or message passing is preferable. Tie to a project if possible.', ARRAY['process','thread','concurrency','race','lock']::text[], ARRAY[]::uuid[], 'primary', true, 15),
  ('fa71e1c8-fb43-4162-954d-966066b6ab29'::uuid, 'cs_master', 'What happens when you type a URL into a browser? Go as deep as you can responsibly.', 'Cover DNS resolution, TCP/TLS handshake at a high level, HTTP request/response, caching, and rendering. Offer to deep-dive one layer (TLS or CDN) based on interviewer interest.

Clarify assumptions (cache cold/warm). Depth with humility beats fake precision.', ARRAY['dns','tcp','tls','rendering','cache','request']::text[], ARRAY[]::uuid[], 'primary', true, 16),
  ('0f74c5d3-e37a-4108-8dc9-dfeb5efa18f3'::uuid, 'cs_master', 'Compare SQL and NoSQL stores. Give a scenario for each.', 'SQL: relational schema, joins, strong consistency/transactions—good for financial ledgers. NoSQL families differ (document, KV, wide-column) and often optimize scale/flexible schemas—good for high-throughput event logs with known access patterns.

Emphasize access patterns drive choice. Avoid dogma.', ARRAY['relational','document','transaction','scale','query']::text[], ARRAY[]::uuid[], 'primary', true, 17),
  ('10d6b9b9-1b29-4d2e-9acd-0f3bd03542f1'::uuid, 'cs_master', 'How would you design a simple URL shortener at a high level?', 'Clarify requirements (read-heavy, unique codes, redirect latency). Sketch API, key generation, persistent store, caching, and analytics. Discuss collisions, idempotency, and scaling reads.

State bottlenecks and monitoring. Classic systems design warm-up for graduate interviews.', ARRAY['redirect','cache','collision','hash','scale']::text[], ARRAY[]::uuid[], 'primary', true, 18),
  ('675d4f89-9d6f-4c0c-8369-6bf2fac4416a'::uuid, 'cs_master', 'Tell me about a time you owned a technically ambiguous project end-to-end.', 'STAR with emphasis on imposing structure: clarifying goals, reducing uncertainty with spikes, stakeholder updates, and delivery metrics.

Graduate admissions and industry alike value ambiguity management.', ARRAY['ambiguity','milestone','stakeholder','risk','scope']::text[], ARRAY[]::uuid[], 'primary', true, 19),
  ('92403e49-ee15-48af-b370-786abbebd34d'::uuid, 'cs_master', 'Describe a conflict on a research or engineering team and how you resolved it.', 'Focus on data-driven resolution: prototypes, benchmarks, or user evidence. Acknowledge other perspectives and the decision rule you used.

Result + relationship repair. Maturity is the signal.', ARRAY['conflict','evidence','compromise','decision','research']::text[], ARRAY[]::uuid[], 'primary', true, 20),
  ('c68d1994-1b10-4769-a489-ae7eafd3e131'::uuid, 'cs_master', 'Tell me about a time you had to learn a new technical area quickly.', 'Explain learning plan: curated readings, minimal viable experiment, expert questions, and teaching-back. Quantify ramp-up (days/weeks) and outcome.

MS study requires rapid acquisition of unfamiliar material.', ARRAY['documentation','prototype','mentor','ramp','paper']::text[], ARRAY[]::uuid[], 'primary', true, 21),
  ('ae1bb4b7-4426-41ec-b116-2f97983794a5'::uuid, 'cs_master', 'Describe a failure in a project or research attempt. What changed afterward?', 'Own the miss (flawed evaluation, overscope, ignored reviewer feedback). Detail postmortem actions and a later success using the new practice.

Resilience matters for thesis risk.', ARRAY['failure','hypothesis','redesign','limitation','learned']::text[], ARRAY[]::uuid[], 'primary', true, 22),
  ('5e255ed6-58ba-4abe-9816-2dcfe5d297a1'::uuid, 'cs_master', 'What kind of problems do you want to be working on 3–5 years after graduation?', 'Name problem class (reliable large-scale services, applied ML systems, security, HCI) and why your MS specialization enables it. Include skills + domain.

Keep ambitions grounded in a skill trajectory.', ARRAY['research','industry','specialization','impact','problem']::text[], ARRAY[]::uuid[], 'primary', true, 23),
  ('cb5b75fa-4c8f-4f7f-a037-9f66f220f11b'::uuid, 'cs_master', 'How do internships or industry experience shape what you want from the MS?', 'If experienced: cite production lessons (on-call, code review, requirements churn) that motivated deeper study. If not: explain how MS projects/internships will supply that.

Show reflective practice, not résumé recitation.', ARRAY['internship','research','course','skill','gap']::text[], ARRAY[]::uuid[], 'primary', true, 24),
  ('d4fbf009-c6e3-4207-83be-19fd72c7867a'::uuid, 'cs_master', 'How do you handle authorship, data integrity, and citation in collaborative research?', 'Discuss early agreement on contributions, never fabricating results, documenting preprocessing, and citing code/data/models. Mention plagiarism includes unattributed paraphrasing and code.

Propose using contribution statements. Integrity is non-negotiable in graduate study.', ARRAY['authorship','citation','integrity','credit','data']::text[], ARRAY[]::uuid[], 'primary', true, 25),
  ('059cedc5-6ea0-4b54-999b-54c7f9a72c13'::uuid, 'cs_master', 'What ethical issues arise in your intended research area (e.g., AI, data, security)?', 'Identify harms (bias, privacy leakage, dual use), affected groups, and mitigation (dataset documentation, differential privacy, responsible disclosure).

Show you can anticipate review boards and social impact—not only model metrics.', ARRAY['privacy','bias','consent','security','dataset']::text[], ARRAY[]::uuid[], 'primary', true, 26),
  ('1903d4ba-f493-4fe3-9f5d-3fc9bd8cce85'::uuid, 'cs_master', 'Where is the line between using AI coding assistants productively and academic misconduct in graduate coursework?', 'Policy-first: follow course rules. Default practice: use assistants for boilerplate/explanation, personally understand and can defend every submitted line, disclose when asked, and never outsource graded reasoning.

Compare to improper collaboration norms.', ARRAY['citation','assistant','disclosure','misconduct','learning']::text[], ARRAY[]::uuid[], 'primary', true, 27),
  ('f3fe27a2-aa95-4df8-84db-04421ae9ecec'::uuid, 'cs_master', 'Walk us through a challenging systems or algorithms assignment and how you validated your solution.', 'Describe requirements, design alternatives, complexity analysis, tests (unit, property, fuzz), and performance measurement. Mention a bug that taught you something.

Evidence of rigorous validation predicts graduate success.', ARRAY['invariant','benchmark','edge','complexity','testing']::text[], ARRAY[]::uuid[], 'primary', true, 28),
  ('e9bb9674-dde7-4034-a792-008a3774717c'::uuid, 'cs_master', 'Explain caching: where it helps, and what consistency problems it introduces.', 'Caching reduces latency/load for read-heavy workloads. Discuss eviction, TTL, stampede, and stale reads. Strategies: cache-aside, invalidation on write, stale-while-revalidate.

Give a concrete example from web or DB query caching.', ARRAY['cache','invalidation','consistency','latency','stale']::text[], ARRAY[]::uuid[], 'primary', true, 29),
  ('d128251c-a98d-45dd-b955-a527dcb95686'::uuid, 'cs_master', 'What is NP-completeness at an intuitive level? Why does it matter in practice?', 'Intuition: many important decision problems have no known polynomial algorithms; if any NP-complete problem has one, all do. In practice we use approximations, heuristics, or constrain inputs.

Example: exact combinatorial optimization vs greedy/ILP heuristics. Shows theoretical literacy for MS theory/AI tracks.', ARRAY['reduction','hardness','approximation','heuristic','exponential']::text[], ARRAY[]::uuid[], 'primary', true, 30),
  ('cac9a7e7-58a6-443d-83f6-17ad197fd2fa'::uuid, 'cs_master', 'What questions do you have about research opportunities, course load, or advising?', 'Ask about typical first-quarter course load, how students find research, funding for RAships, or industrial affiliate projects. Avoid easily Googled logistics only.

Thoughtful questions signal serious graduate intent.', ARRAY['advisor','funding','research','course','load']::text[], ARRAY[]::uuid[], 'primary', true, 31),
  ('069f83e3-6f89-4f65-9454-92b91987cac9'::uuid, 'cs_master', 'Tell me about a time you gave or received hard feedback on technical work.', 'STAR focusing on specificity of feedback (benchmarks, code review comments), emotional professionalism, and measurable improvement afterward.

Graduate labs depend on candid critique.', ARRAY['feedback','revision','tradeoff','review','specific']::text[], ARRAY[]::uuid[], 'primary', true, 32),
  ('d8e12534-7497-4138-9735-d32d372bc913'::uuid, 'cs_master', 'How do you manage time across courses, research, and personal wellbeing in a demanding graduate term?', 'Describe planning cadence (weekly goals, milestone demos), saying no to low-value commitments, and early escalation when blocked. Mention sustainable hours and help-seeking.

Burnout awareness is a maturity signal.', ARRAY['schedule','research','deadline','priority','rest']::text[], ARRAY[]::uuid[], 'primary', true, 33),
  ('e0f72227-39ed-46c8-a233-21d976a5ad87'::uuid, 'cs_master', 'Explain CAP theorem trade-offs at a practical level for a distributed key-value store.', 'Under partition, systems lean toward availability or consistency. Give examples: shopping cart soft-state vs bank ledger strong consistency. Mention that “CA without P” is misleading in real networks.

Stay practical; avoid buzzword fog.', ARRAY['availability','consistency','partition','replica','latency']::text[], ARRAY[]::uuid[], 'primary', true, 34),
  ('a9a8bca5-dd0c-4d0c-980f-ab14542b81b0'::uuid, 'cs_master', 'How have letters of recommendation or mentors shaped your readiness for graduate study?', 'Without inventing claims, explain what recommenders observed (research independence, performance in hard courses) and how mentorship changed your standards.

Shows reflective understanding of evaluation criteria Stanford FAQ-style applications emphasize.', ARRAY['mentor','recommendation','preparedness','letter','research']::text[], ARRAY[]::uuid[], 'primary', true, 35),
  ('1fd88854-4c87-4ad1-b7f7-ff9dad320e8b'::uuid, 'cs_master', 'If your first-choice specialization is full, how would you adapt your MS plan?', 'Show flexibility: adjacent specializations, prerequisite strengthening, or research group pivots that still serve long-term goals. Demonstrates resilience and genuine interest in CS broadly.

Avoid sounding indifferent; show a reasoned plan B.', ARRAY['elective','advisor','specialization','backup','course']::text[], ARRAY[]::uuid[], 'primary', true, 36),
  ('29419fd5-770e-4173-bf33-6ed83948def3'::uuid, 'cs_master', 'How would you detect a cycle in a linked list, and what are the complexity trade-offs?', 'Discuss Floyd’s tortoise-hare O(1) extra space vs hashing node identities O(n) space. Explain correctness intuition and edge cases (empty, single node).

Clean algorithmic communication expected in technical MS interviews.', ARRAY['cycle','pointer','tortoise','complexity','linked']::text[], ARRAY[]::uuid[], 'primary', true, 37),
  ('d07cf775-40a0-4b15-ae59-fcf1e51ad6cb'::uuid, 'cs_master', 'What does success in your first year of the MS look like for you?', 'Define academic success (mastery in core courses), research/engineering milestones, professional network, and wellbeing metrics. Include a feedback loop for adjusting course load.

Concrete success criteria beat vague “do well.”', ARRAY['publication','milestone','foundation','research','course']::text[], ARRAY[]::uuid[], 'primary', true, 38),
  ('87574615-92f7-43c8-b82f-c8674b31ef43'::uuid, 'cs_master', 'How would you evaluate whether an empirical result in systems/ML is believable?', 'Check baselines, ablations, data leakage, variance across seeds/workloads, statistical significance where relevant, and reproducibility artifacts. Ask what would falsify the claim.

Critical evaluation skill is central to graduate research interviews.', ARRAY['baseline','ablation','reproducibility','control','statistical']::text[], ARRAY[]::uuid[], 'primary', true, 39)
;

insert into public.forge_v2_questions (id, profile_id, prompt, sample_answer, keywords, related_ids, kind, active, sort_order)
values
  ('3f5a9186-be3c-4796-9ce1-3303473de28a'::uuid, 'data_analyst', 'Tell me about yourself and why you want to be a data analyst.', 'Focus on your path into analytics: curiosity about evidence-based decisions, a project that sparked interest, and skills you bring (SQL, spreadsheets, communication).

Answer three silent questions: what excites you about analysis, about this role, and why you are a strong fit.', ARRAY['insight','stakeholder','decision','metric','analyst']::text[], ARRAY[]::uuid[], 'primary', true, 0),
  ('a8a95c85-c17b-47fa-9865-39dc6295c34f'::uuid, 'data_analyst', 'What do data analysts do, and how do they create business value?', 'Describe the loop: identify questions, collect, clean, analyze, interpret, and communicate recommendations that improve decisions.

Give a concrete value example (reduce churn, optimize marketing spend) rather than a dictionary definition.', ARRAY['insight','decision','metric','stakeholder','dashboard']::text[], ARRAY[]::uuid[], 'primary', true, 1),
  ('3fbf75a2-4d9e-4a51-a4f9-ad0bca49c928'::uuid, 'data_analyst', 'Describe your most successful data analysis project. What made it successful?', 'STAR with your role, methods, stakeholders, and outcome metrics. Map skills used to the job description.

Success = decision changed or measurable impact, not only a pretty dashboard.', ARRAY['recommendation','impact','metric','decision','insight']::text[], ARRAY[]::uuid[], 'primary', true, 2),
  ('2c077e5a-76db-4ee0-b19f-700c2bc1d75f'::uuid, 'data_analyst', 'Tell me about your most challenging data project and what you learned.', 'Be honest about incomplete data, small samples, or shifting requirements. Focus on lessons and what you would do differently.

Shows resilience and methodological humility.', ARRAY['missing','outlier','assumption','validation','lesson']::text[], ARRAY[]::uuid[], 'primary', true, 3),
  ('a9b1c5b4-1ad8-4149-a64e-335a3971f0ce'::uuid, 'data_analyst', 'Tell me about a time you got unexpected results. What did you do?', 'Explain validation steps (query checks, data lineage, peer review), how you avoided confirmation bias, and any new opportunity the surprise revealed.

Interviewers test whether data—not ego—drives conclusions.', ARRAY['unexpected','hypothesis','bias','validation','source']::text[], ARRAY[]::uuid[], 'primary', true, 4),
  ('016f07db-29b0-4229-ad9a-f5c2a7cb5435'::uuid, 'data_analyst', 'What’s the largest data set you’ve worked with? What was hard about it?', 'Discuss rows/columns, data types, tools used, and challenges (joins, performance, quality). Academic/bootcamp data counts if job experience is limited.

Focus on techniques for scale, not bragging sizes.', ARRAY['volume','memory','sampling','warehouse','performance']::text[], ARRAY[]::uuid[], 'primary', true, 5),
  ('9680cd0c-e634-4376-80b5-f4651df6ebc6'::uuid, 'data_analyst', 'What is your process for cleaning data?', 'Explain profiling, handling missing/duplicate values, type fixes, outlier investigation, and reconciling multiple sources. Emphasize documenting transforms.

Cleaning is often most of the timeline—treat it as core skill.', ARRAY['duplicate','missing','validation','standardize','type']::text[], ARRAY[]::uuid[], 'primary', true, 6),
  ('9193a6f4-d719-4bed-880c-94e39cff3f19'::uuid, 'data_analyst', 'How do you handle missing data?', 'Diagnose mechanism (MCAR/MAR/MNAR intuition), then choose deletion, imputation, or separate “missing” category based on analysis goals. Report sensitivity checks.

Never silently drop large fractions without disclosure.', ARRAY['imputation','missing','bias','indicator','drop']::text[], ARRAY[]::uuid[], 'primary', true, 7),
  ('3f1c7dd0-66eb-4b6e-8a4d-bdfe52eb5d0d'::uuid, 'data_analyst', 'How do you detect and treat outliers?', 'Use domain rules + statistical screens; investigate before deleting—outliers may be fraud or critical rare events. Document treatment.

Visualize distributions when possible.', ARRAY['outlier','quartile','deviation','median','robust']::text[], ARRAY[]::uuid[], 'primary', true, 8),
  ('7a1592a7-e105-4dd5-a03d-e71cd6c024d9'::uuid, 'data_analyst', 'Walk through your end-to-end process when starting a new analytics project.', 'Clarify the business question and success metric, identify data sources, clean/EDA, analyze, validate, visualize, and socialize recommendations with follow-up metrics.

Ask stakeholders “what decision will this inform?” early.', ARRAY['cleaning','analysis','visualization','stakeholder','question']::text[], ARRAY[]::uuid[], 'primary', true, 9),
  ('6fac8512-2ba1-48ea-a7d7-8951904270ac'::uuid, 'data_analyst', 'Explain INNER JOIN vs LEFT JOIN with a business example.', 'INNER keeps matching keys only; LEFT keeps all left rows with nulls for non-matches. Example: all customers left-joined to orders to find never-purchased customers.

Mention accidental row duplication from many-to-many joins.', ARRAY['inner','unmatched','customer','join','left']::text[], ARRAY[]::uuid[], 'primary', true, 10),
  ('8b6917bf-458c-40a5-92ff-f169a3f39040'::uuid, 'data_analyst', 'How do GROUP BY and aggregate functions work together?', 'GROUP BY collapses rows sharing key values while aggregates (COUNT, SUM, AVG) compute per group. WHERE filters pre-aggregation; HAVING filters post-aggregation.

Give a revenue-by-month example.', ARRAY['aggregate','average','dimension','count','group']::text[], ARRAY[]::uuid[], 'primary', true, 11),
  ('8fdc3c63-4250-4b6f-b21a-9091f36178a6'::uuid, 'data_analyst', 'What are primary keys and foreign keys?', 'Primary key uniquely identifies a row; foreign key references another table’s key to enforce relationships. Discuss cascading risks and surrogate vs natural keys.

Integrity constraints prevent analytics nightmares.', ARRAY['primary','foreign','unique','constraint','relationship']::text[], ARRAY[]::uuid[], 'primary', true, 12),
  ('59b39948-6a09-4a04-afa7-370244bd5eba'::uuid, 'data_analyst', 'Explain UNION vs UNION ALL.', 'UNION concatenates result sets and deduplicates; UNION ALL keeps duplicates and is faster. Schemas/column counts must align.

Choose based on whether duplicates are meaningful.', ARRAY['union','distinct','duplicate','rows','combine']::text[], ARRAY[]::uuid[], 'primary', true, 13),
  ('e9723eed-f59d-4d1d-8cea-0d02df14c815'::uuid, 'data_analyst', 'What is a window function? Give an example use case.', 'Window functions compute across related rows without collapsing groups—e.g., ROW_NUMBER, running SUM, LAG for month-over-month.

Example: rank users by spend within each country.', ARRAY['window','rank','partition','running','over']::text[], ARRAY[]::uuid[], 'primary', true, 14),
  ('8f5447e5-7557-49cd-9e43-90086f434e56'::uuid, 'data_analyst', 'How would you write a query to find duplicate records?', 'GROUP BY the business key HAVING COUNT(*) > 1, or use window ROW_NUMBER() and filter rn > 1. Discuss which columns define duplication.

Then explain remediation carefully.', ARRAY['duplicate','having','distinct','count','group']::text[], ARRAY[]::uuid[], 'primary', true, 15),
  ('39ecebed-4cb6-4d43-b450-abcf1c1cb4f3'::uuid, 'data_analyst', 'Given a slow SQL query, how do you debug it?', 'Inspect filters/joins for fan-outs, check indexes, reduce scanned columns, EXPLAIN plans, and validate predicate pushdown. Confirm correctness before micro-optimizing.

Speak to collaboration with data engineers when needed.', ARRAY['explain','index','scan','plan','slow']::text[], ARRAY[]::uuid[], 'primary', true, 16),
  ('c611c9e2-d746-484d-89aa-27a4f142bc89'::uuid, 'data_analyst', 'Which statistical methods have you used in analysis?', 'Mention descriptive stats, distributions, confidence intervals, hypothesis tests, and regression at a level you’ve actually used. Tie each to a business insight.

Honesty about depth beats laundry lists.', ARRAY['regression','significance','interval','distribution','test']::text[], ARRAY[]::uuid[], 'primary', true, 17),
  ('44b2abc4-8f1b-4988-a34d-4bd278de59f9'::uuid, 'data_analyst', 'Explain the difference between descriptive and inferential statistics.', 'Descriptive summarizes observed data; inferential uses samples to make claims about populations with uncertainty.

Example: dashboard averages vs estimating lift from an A/B test.', ARRAY['descriptive','inferential','sample','population','generalize']::text[], ARRAY[]::uuid[], 'primary', true, 18),
  ('d879d792-4e1a-444e-850f-94e4f0c74c1d'::uuid, 'data_analyst', 'How does hypothesis testing work in plain language?', 'State null/alternative, choose a test, compute a statistic/p-value or CI, and decide under a significance threshold—while discussing practical significance and assumptions.

Avoid claiming “proved” the alternative.', ARRAY['hypothesis','significance','null','sample','pvalue']::text[], ARRAY[]::uuid[], 'primary', true, 19),
  ('18bb6da8-1388-4c61-9295-e1b2d5682a17'::uuid, 'data_analyst', 'What is an A/B test? What can go wrong?', 'Randomly assign users to variants to estimate causal lift on a primary metric. Pitfalls: peeking, multiple comparisons, sample ratio mismatch, novelty effects, and underpowered tests.

Mention guardrail metrics.', ARRAY['experiment','conversion','randomization','bias','sample']::text[], ARRAY[]::uuid[], 'primary', true, 20),
  ('d353a54e-66ec-4475-8462-8e17bf6c2eba'::uuid, 'data_analyst', 'How do you choose a sample size for an experiment?', 'Based on baseline rate, minimum detectable effect, significance level, and power. Smaller effects need larger samples.

If formulas aren’t memorized, explain the inputs and that you’d use a power calculator—then interpret outputs.', ARRAY['sample','power','effect','significance','confidence']::text[], ARRAY[]::uuid[], 'primary', true, 21),
  ('ba96e96c-2af9-4875-8190-2898a526408b'::uuid, 'data_analyst', 'Explain correlation vs causation with a business example.', 'Correlation is association; causation means intervening on X changes Y. Ice cream and drowning correlate via summer. In business, use experiments or strong causal designs before claiming drivers.

Analysts protect companies from false stories.', ARRAY['correlation','causation','confounder','experiment','revenue']::text[], ARRAY[]::uuid[], 'primary', true, 22),
  ('0b822aaf-35eb-438a-b4d5-8d30a6911543'::uuid, 'data_analyst', 'How do you explain technical findings to a non-technical audience?', 'Lead with the decision and recommendation, then 1–2 supporting charts, then caveats. Adjust depth to audience; avoid jargon or define it.

Practice with non-technical friends if needed—Coursera’s tip.', ARRAY['audience','chart','recommendation','jargon','insight']::text[], ARRAY[]::uuid[], 'primary', true, 23),
  ('402a4371-b7bb-409b-bc5f-4dfe74999982'::uuid, 'data_analyst', 'What makes a dashboard useful versus noisy?', 'Clear purpose, few critical metrics, definitions documented, freshness indicators, and actionable filters. Avoid vanity metrics and chartjunk.

Iterate with users after launch.', ARRAY['dashboard','filter','comparison','action','noise']::text[], ARRAY[]::uuid[], 'primary', true, 24),
  ('8e5a6681-fe1c-4bf3-ab13-bdecb61df674'::uuid, 'data_analyst', 'Which chart types do you choose for trends vs compositions vs relationships?', 'Trends: line. Comparisons: bar. Composition: stacked bar/careful pie. Relationships: scatter. Distributions: histogram/box.

Justify choices by the question being answered.', ARRAY['trend','composition','relationship','chart','bar']::text[], ARRAY[]::uuid[], 'primary', true, 25),
  ('d2425ba4-5c00-4226-bc45-60ae7c5dc94b'::uuid, 'data_analyst', 'How would you measure the performance of our company or product?', 'Show research: north-star metric candidates, input metrics, and guardrails. Tie to industry context and available data.

Propose a starter scorecard and questions you’d ask stakeholders.', ARRAY['conversion','retention','revenue','definition','metric']::text[], ARRAY[]::uuid[], 'primary', true, 26),
  ('97614368-9dcd-4039-89fa-36a2970eb715'::uuid, 'data_analyst', 'How would you estimate … (Fermi question, e.g., best month for a shoe discount)?', 'Think aloud: needed data, proxies, assumptions, calculation, and uncertainty. Then say how you’d validate with real data.

Interviewers score structure more than exact numbers.', ARRAY['estimate','assumption','range','sanity','bound']::text[], ARRAY[]::uuid[], 'primary', true, 27),
  ('e6b634f5-67f4-4f9e-8c3c-2ca63623973f'::uuid, 'data_analyst', 'A metric dropped 10% week-over-week. How do you investigate?', 'Check instrumentation bugs, seasonality, segment the drop, correlate with releases/marketing, and form hypotheses with quick SQL pulls. Communicate early if data is broken.

Structured triage beats panic.', ARRAY['segment','seasonality','tracking','regression','drop']::text[], ARRAY[]::uuid[], 'primary', true, 28),
  ('a303740d-029e-4b0c-9112-1e5ae9a1c68f'::uuid, 'data_analyst', 'What data analytics software and tools are you familiar with?', 'List tools by stage: SQL warehouses, Excel/Sheets, BI (Tableau/Looker), Python/R. Match the job posting; show transferable learning speed for unfamiliar tools.

Give a concrete task you did in each.', ARRAY['python','tableau','warehouse','excel','sql']::text[], ARRAY[]::uuid[], 'primary', true, 29),
  ('f196c72e-7243-480c-a3dd-70c2237c0cb3'::uuid, 'data_analyst', 'What scripting languages are you trained in (SQL, Python, R)? Which do you prefer and why?', 'Be truthful; explain strengths (SQL for relational queries; Python for flexible analysis/ML-lite; R for stats). Show enthusiasm to learn the team’s stack.

Mention favourite SQL functions with examples.', ARRAY['python','dataframe','query','script','sql']::text[], ARRAY[]::uuid[], 'primary', true, 30),
  ('9e54a141-aef6-455e-9873-b2f096a77fea'::uuid, 'data_analyst', 'How have you used Excel (or Sheets) in analysis?', 'Discuss pivots, VLOOKUP/XLOOKUP or INDEX-MATCH, cleaning, and limitations at scale that push you to SQL. Know function vs formula distinction.

Spreadsheets remain ubiquitous in interviews.', ARRAY['pivot','formula','spreadsheet','chart','table']::text[], ARRAY[]::uuid[], 'primary', true, 31),
  ('0a083d5d-3364-48ac-99ba-8b0caa5f79cf'::uuid, 'data_analyst', 'Explain VLOOKUP limitations and when INDEX/MATCH or joins are better.', 'VLOOKUP needs lookup column left of values (classic), breaks on column inserts, and struggles with large data. INDEX/MATCH more flexible; SQL joins scale better.

Show practical migration judgment.', ARRAY['lookup','match','join','approximate','index']::text[], ARRAY[]::uuid[], 'primary', true, 32),
  ('f6d44c73-ca2a-47db-ad99-45b4f78b40fb'::uuid, 'data_analyst', 'Define mean, variance, and standard deviation for a stakeholder.', 'Mean is a centre value; variance/SD describe spread around it. Use a salary or delivery-time example to show why averages hide risk.

Offer median when skew matters.', ARRAY['mean','variance','deviation','spread','average']::text[], ARRAY[]::uuid[], 'primary', true, 33),
  ('6be4dcc7-f509-4616-9d61-06f710b2bde7'::uuid, 'data_analyst', 'What is regression analysis used for in business analytics?', 'Estimate relationships between variables, control for confounders (cautiously), and predict outcomes. Stress assumptions and that observational regression ≠ automatic causation.

Example: relating spend to conversions with caveats.', ARRAY['regression','prediction','coefficient','relationship','trend']::text[], ARRAY[]::uuid[], 'primary', true, 34),
  ('7c4e9e18-0a1a-49db-a10f-ec95a3367819'::uuid, 'data_analyst', 'What is your greatest strength as a data analyst? A weakness you are improving?', 'Strength with evidence (clear storytelling, SQL performance, careful validation). Weakness that is real and under active improvement (public speaking, a tool gap) with actions taken.

Avoid cliché “perfectionism” without substance.', ARRAY['strength','weakness','communication','insight','stakeholder']::text[], ARRAY[]::uuid[], 'primary', true, 35),
  ('01c0c4fa-f669-4f25-88ea-f18c58249e55'::uuid, 'data_analyst', 'How do you ensure your analysis is reproducible?', 'Version SQL/notebooks, document assumptions, seed random steps, freeze data pulls with timestamps, and peer review. Prefer modular pipelines over one-off spreadsheets when stakes are high.

Reproducibility builds trust.', ARRAY['notebook','version','query','documentation','reproducible']::text[], ARRAY[]::uuid[], 'primary', true, 36),
  ('38918903-a704-492c-b138-d35c99ab978e'::uuid, 'data_analyst', 'How would you prioritize multiple stakeholder analytics requests?', 'Assess decision urgency, impact, effort, and data readiness. Communicate timelines transparently; offer lightweight interim answers when useful.

Shows product sense for analyst roles.', ARRAY['priority','stakeholder','impact','deadline','request']::text[], ARRAY[]::uuid[], 'primary', true, 37),
  ('41570d41-9608-4715-bb9e-f91acbf1428f'::uuid, 'data_analyst', 'Explain clustered vs non-clustered indexes at a high level (analyst view).', 'Clustered index defines physical row order (often the primary key); non-clustered provides alternate lookup structures. Knowing this helps interpret why some filters are fast.

Defer deep DBA detail unless asked.', ARRAY['clustered','index','scan','range','lookup']::text[], ARRAY[]::uuid[], 'primary', true, 38),
  ('8642e1d5-5e0f-4507-ac62-15cd2c8145de'::uuid, 'data_analyst', 'What questions do you have for us about data culture, metrics ownership, or tooling?', 'Ask how metrics are defined/governed, how analysts partner with engineers, dashboard sprawl control, and success in the first 90 days.

Coursera advises preparing questions about day-to-day, expectations, and culture.', ARRAY['metric','ownership','tooling','culture','dashboard']::text[], ARRAY[]::uuid[], 'primary', true, 39)
;

insert into public.forge_v2_questions (id, profile_id, prompt, sample_answer, keywords, related_ids, kind, active, sort_order)
values
  ('13e07a82-9b94-4564-98f1-3ca542100255'::uuid, 'frontend_engineer', 'Why frontend engineering, and why this team’s product?', 'Explain attraction to user-facing quality: accessibility, performance, design systems. Cite a product UX detail you admire and a frontend challenge it implies (state, i18n, offline).

Align with the stack in the job description without pretending expertise you lack.', ARRAY['interface','product','accessibility','performance','user']::text[], ARRAY[]::uuid[], 'primary', true, 0),
  ('d6933e9c-7ec5-45a4-b623-8bf92f683ead'::uuid, 'frontend_engineer', 'Tell me about a UI project where requirements changed mid-way. How did you adapt?', 'STAR: changing specs, how you protected UX consistency, refactored components, communicated trade-offs, and shipped incremental value.

Frontend roles face frequent design iteration—show calm adaptability.', ARRAY['requirement','adapt','component','redesign','scope']::text[], ARRAY[]::uuid[], 'primary', true, 1),
  ('fb6f320e-d30c-4f40-b2ac-70c7255f6386'::uuid, 'frontend_engineer', 'Describe a disagreement with a designer or PM about UX vs engineering constraints.', 'Explain constraints (performance, a11y, time), alternatives you proposed (progressive enhancement, phased rollout), and the user-centered outcome.

Respect for design craft + engineering realism.', ARRAY['designer','constraint','accessibility','performance','tradeoff']::text[], ARRAY[]::uuid[], 'primary', true, 2),
  ('63e065fe-4f7e-4d12-9e72-ae021a8a3d52'::uuid, 'frontend_engineer', 'Explain the differences between var, let, and const.', 'var is function-scoped and hoisted; let/const are block-scoped. const prevents rebinding (not deep immutability). Prefer const by default, let when reassignment needed, avoid var in modern code.

Give a short temporal-dead-zone example.', ARRAY['const','reassignment','scope','temporal']::text[], ARRAY[]::uuid[], 'primary', true, 3),
  ('1ef9e1d2-64e8-4e05-99a7-a9799fe47dc8'::uuid, 'frontend_engineer', 'What is hoisting in JavaScript?', 'Hoisting is the behaviour where declarations are processed before execution. var declarations are initialized undefined; let/const are in TDZ; function declarations are fully hoisted.

Show a small example and why relying on hoisting hurts readability.', ARRAY['hoisting','declaration','scope','function']::text[], ARRAY[]::uuid[], 'primary', true, 4),
  ('1c1aea2c-208a-4241-b36c-88fb752f61c5'::uuid, 'frontend_engineer', 'Explain closures with a practical example.', 'A closure lets an inner function access an outer function’s variables after the outer has returned—e.g., a counter factory or private state in modules.

Mention common interview uses: debouncing, partial application. Warn about accidental retention of large memory via closures.', ARRAY['closure','scope','lexical','variable','function']::text[], ARRAY[]::uuid[], 'primary', true, 5),
  ('3fd95c04-474a-4d38-bec7-b7e6773a5856'::uuid, 'frontend_engineer', 'What is the difference between == and === ?', '== coerces types; === compares without coercion. Prefer === to avoid surprising equality (e.g., 0 == ""). Mention Object.is for edge cases like NaN.

Short and precise.', ARRAY['equality','coercion','strict','comparison']::text[], ARRAY[]::uuid[], 'primary', true, 6),
  ('ed109e24-0efc-482e-a50d-79f6f4730902'::uuid, 'frontend_engineer', 'How does the this keyword work in JavaScript?', 'this depends on call site: default/global, method, call/apply/bind, constructor, and arrow functions inheriting lexical this. Give one example of bind fixing a callback.

Avoid overclaiming; offer to discuss event handlers.', ARRAY['binding','method','arrow','context']::text[], ARRAY[]::uuid[], 'primary', true, 7),
  ('eaee311b-2dd4-45dd-bc04-becf5a09e94f'::uuid, 'frontend_engineer', 'Explain promises and async/await. How do you handle errors?', 'Promises represent eventual fulfillment/rejection. async/await syntax pauses for settlement; wrap in try/catch. Discuss Promise.all vs allSettled for parallelism.

Mention avoiding unhandled rejections.', ARRAY['promise','async','rejection','await','error']::text[], ARRAY[]::uuid[], 'primary', true, 8),
  ('1a1d6a51-0d79-4a7f-b1bc-3faf78205ffe'::uuid, 'frontend_engineer', 'What is the event loop? How do microtasks differ from macrotasks?', 'JS runs on a single-threaded event loop: call stack, then microtasks (promise jobs), then macrotasks (setTimeout, I/O). Explain why promise then runs before setTimeout(0).

Keep diagram-level clarity.', ARRAY['microtask','macrotask','queue','loop']::text[], ARRAY[]::uuid[], 'primary', true, 9),
  ('e97649a5-ec29-4218-b045-90f0cd981e9f'::uuid, 'frontend_engineer', 'Implement or explain debounce and throttle. When would you use each?', 'Debounce: wait until calls stop (search autocomplete). Throttle: ensure regular intervals (scroll handlers). Sketch timer-based implementations using closures.

Discuss leading vs trailing edges briefly.', ARRAY['debounce','throttle','scroll','input','delay']::text[], ARRAY[]::uuid[], 'primary', true, 10),
  ('dac8bb0f-679a-49c7-b3f6-500c8608389b'::uuid, 'frontend_engineer', 'Explain event bubbling and capturing. How do you stop propagation?', 'Capturing goes window→target; bubbling target→window. stopPropagation prevents further propagation; mention stopImmediatePropagation and when preventing default differs.

Relate to delegated event listeners.', ARRAY['bubbling','capturing','propagation','target']::text[], ARRAY[]::uuid[], 'primary', true, 11),
  ('d647a866-296f-480f-af90-04b783ed82d5'::uuid, 'frontend_engineer', 'How would you polyfill Array.map / filter / reduce at a high level?', 'Describe iterating this, building a new array (map/filter) or accumulator (reduce), invoking callback with element/index/array. Check for existing native methods first.

Shows deep array-method understanding.', ARRAY['callback','reduce','filter','array']::text[], ARRAY[]::uuid[], 'primary', true, 12),
  ('43cbd342-837f-47c5-911f-b44997ebf878'::uuid, 'frontend_engineer', 'What is React, and why use it for UI?', 'React is a library for building UIs via components and declarative rendering; it efficiently updates the DOM when state changes. Benefits: composition, ecosystem, unidirectional data patterns.

Acknowledge alternatives exist; tailor to the company’s stack.', ARRAY['component','state','rendering','declarative']::text[], ARRAY[]::uuid[], 'primary', true, 13),
  ('fb6df01d-98b6-448a-9373-60574bba417d'::uuid, 'frontend_engineer', 'Explain useState and immutable state updates.', 'useState returns state and setter; updates queue re-renders. Never mutate arrays/objects in place—copy with spread/map. Functional updates when depending on prior state.

Give a counter and a todo-list example.', ARRAY['immutable','setter','update','state']::text[], ARRAY[]::uuid[], 'primary', true, 14),
  ('59fb0725-da26-41f7-a6f2-740430c3b4ad'::uuid, 'frontend_engineer', 'How does useEffect work? Discuss dependencies and cleanup.', 'useEffect runs side effects after paint; dependency array controls re-runs; empty array ≈ mount; omitted deps re-run each render (usually a smell). Cleanup clears timers/subscriptions.

Mention exhaustive-deps lint rule philosophy.', ARRAY['effect','dependency','cleanup','render']::text[], ARRAY[]::uuid[], 'primary', true, 15),
  ('23483bdb-6f98-4599-9dbd-961b14320873'::uuid, 'frontend_engineer', 'When would you use useRef or useReducer instead of useState?', 'useRef holds mutable values without re-render (DOM nodes, previous values). useReducer suits complex state transitions/action-based updates.

Sketch a form wizard with useReducer.', ARRAY['reducer','reference','mutable','state']::text[], ARRAY[]::uuid[], 'primary', true, 16),
  ('439438e5-508e-4fb2-88d5-83e306664bff'::uuid, 'frontend_engineer', 'What are custom hooks, and when should you write one?', 'Custom hooks extract reusable stateful logic (e.g., useFetch, useKeyboard). Rules of hooks still apply. Avoid premature abstraction until duplication is clear.

Describe testing a custom hook briefly.', ARRAY['hook','reuse','logic','state']::text[], ARRAY[]::uuid[], 'primary', true, 17),
  ('e2c54ad1-3272-4f1e-b93e-ff04e011422c'::uuid, 'frontend_engineer', 'Explain reconciliation and keys in React lists.', 'React diffs virtual trees to update the DOM. Keys help identify list items across renders—stable IDs beat array indices when order changes.

Discuss bugs from index keys (state misassociation).', ARRAY['reconciliation','key','identity','list']::text[], ARRAY[]::uuid[], 'primary', true, 18),
  ('6e471052-b223-4295-b23c-83b49a1ecc4b'::uuid, 'frontend_engineer', 'Controlled vs uncontrolled components in React forms?', 'Controlled: input value driven by React state—predictable validation. Uncontrolled: DOM holds state via refs—simpler for quick forms/file inputs.

Prefer controlled for complex UX; know both.', ARRAY['controlled','uncontrolled','input','form']::text[], ARRAY[]::uuid[], 'primary', true, 19),
  ('b0a4cc33-89ab-4095-9606-d9ed1dbf5b64'::uuid, 'frontend_engineer', 'Explain Flexbox vs CSS Grid. When do you pick each?', 'Flexbox: one-dimensional alignment (nav rows). Grid: two-dimensional layouts (page structure). They compose well.

Mention responsive breakpoints and gap properties.', ARRAY['flexbox','grid','alignment','layout']::text[], ARRAY[]::uuid[], 'primary', true, 20),
  ('ea0c68b2-98d6-4798-9ea8-e757233341d0'::uuid, 'frontend_engineer', 'How do you create a responsive layout? Discuss mobile-first approaches.', 'Mobile-first media queries, fluid units (%, rem, clamp), flexible images, and testing real devices. Avoid hiding critical content only on mobile.

Mention container queries where relevant.', ARRAY['responsive','breakpoint','viewport','mobile']::text[], ARRAY[]::uuid[], 'primary', true, 21),
  ('77747280-8932-4b59-aae8-9d0736449644'::uuid, 'frontend_engineer', 'What is the CSS box model, and how does box-sizing: border-box help?', 'Content + padding + border (+ margin outside). border-box includes padding/border in width calculations—more intuitive layouts.

Relate to debugging overflow issues.', ARRAY['margin','padding','border','sizing','box']::text[], ARRAY[]::uuid[], 'primary', true, 22),
  ('b0460657-29b1-4df9-ac03-63eb4681b894'::uuid, 'frontend_engineer', 'How do you diagnose and fix a slow web page?', 'Use Lighthouse/Web Vitals (LCP, INP, CLS), waterfall networks, and React profilers. Fixes: code-split, image optimization, cache, reduce JS main-thread work, defer non-critical scripts.

Prioritize user-centric metrics.', ARRAY['performance','render','network','bundle','waterfall']::text[], ARRAY[]::uuid[], 'primary', true, 23),
  ('5632760c-2adb-4da3-95b6-c6e2cae73c1e'::uuid, 'frontend_engineer', 'What are practical steps to improve accessibility (a11y) in a React app?', 'Semantic HTML, keyboard navigation, focus management for modals, ARIA only when needed, colour contrast, labels for inputs, and screen-reader testing.

Accessibility is a quality bar, not a polish phase.', ARRAY['keyboard','label','contrast','screen','reader']::text[], ARRAY[]::uuid[], 'primary', true, 24),
  ('648780c7-6529-42d5-a61c-3874c3b3f350'::uuid, 'frontend_engineer', 'Explain critical rendering path and how CSS/JS can block it.', 'Browser parses HTML, builds DOM/CSSOM, render tree, layout, paint. Blocking CSS/JS delays first paint—mitigate with defer/async, critical CSS, and minimizing payloads.

Shows browser-internals literacy.', ARRAY['blocking','stylesheet','parser','critical','rendering']::text[], ARRAY[]::uuid[], 'primary', true, 25),
  ('c80df412-92eb-48b7-8436-db54e78d3b66'::uuid, 'frontend_engineer', 'How does client-side routing work in SPAs, and what SEO/a11y caveats exist?', 'History API / hash routing updates UI without full reload. Caveats: initial load SEO (SSR/SSG help), focus management on route change, and hosting fallbacks to index.html.

Discuss Next.js-style SSR if relevant.', ARRAY['routing','history','accessibility','crawl']::text[], ARRAY[]::uuid[], 'primary', true, 26),
  ('e3bfff7f-0295-4f9e-90bb-77de5fa8d2fc'::uuid, 'frontend_engineer', 'REST vs GraphQL from a frontend consumer’s perspective?', 'REST: multiple endpoints, caching via HTTP semantics. GraphQL: flexible queries, risk of complex client caching and over-fetching solutions like persisted queries.

Choose based on product needs and team skills.', ARRAY['graphql','rest','overfetch','cache','query']::text[], ARRAY[]::uuid[], 'primary', true, 27),
  ('3fd5fecb-550c-4829-99c7-cb4bb6c5732b'::uuid, 'frontend_engineer', 'How do you manage authentication tokens securely in a browser app?', 'Prefer httpOnly secure cookies for session tokens when possible; if using localStorage, understand XSS risk. Discuss refresh rotation, CSRF for cookies, and short expiries.

Never hardcode secrets in frontend bundles.', ARRAY['token','cookie','storage','session','xss']::text[], ARRAY[]::uuid[], 'primary', true, 28),
  ('d7ce346e-48aa-43a9-88c3-803ad0767d40'::uuid, 'frontend_engineer', 'How do you test React components? Distinguish unit, integration, and e2e.', 'Unit: pure logic/hooks. Integration: React Testing Library user flows. E2E: Playwright/Cypress for critical paths. Prefer testing behaviour over implementation details.

Mention avoiding brittle snapshot overuse.', ARRAY['testing','mock','component','integration','browser']::text[], ARRAY[]::uuid[], 'primary', true, 29),
  ('2eefff65-be10-4ebe-9269-cd2e0833df14'::uuid, 'frontend_engineer', 'What bundlers/build tools have you used, and what problems do they solve?', 'Webpack/Vite/esbuild: module bundling, transpilation, code splitting, asset pipelines. Discuss cold start DX (Vite) and production optimizations.

Relate to a slow-build improvement story if possible.', ARRAY['bundler','transpile','minify','treeshake']::text[], ARRAY[]::uuid[], 'primary', true, 30),
  ('bb9663a5-4302-4ef7-8e00-9a4267bb8080'::uuid, 'frontend_engineer', 'Explain prototypal inheritance vs class syntax in JavaScript.', 'JS objects delegate via [[Prototype]] chains; class syntax is sugar over constructor functions + prototypes. Object.create and prototype methods still matter under the hood.

Give a small inheritance example.', ARRAY['prototype','inheritance','class','chain']::text[], ARRAY[]::uuid[], 'primary', true, 31),
  ('2622b7b1-8886-45a4-a832-7dc92fe12152'::uuid, 'frontend_engineer', 'Tell me about a time you improved frontend performance or Core Web Vitals.', 'STAR with baseline metrics, changes (lazy routes, image CDN, memoization with care), and after metrics. Mention monitoring regressions.

Impact talk > buzzwords.', ARRAY['vitals','layout','paint','bundle','latency']::text[], ARRAY[]::uuid[], 'primary', true, 32),
  ('16d69c03-8231-4387-b1f6-5237c0b6c41b'::uuid, 'frontend_engineer', 'How do you prevent unnecessary re-renders in React?', 'Correct state placement, memoization (React.memo, useMemo, useCallback) when measured necessary, stable keys, and avoiding inline unstable objects in props.

Warn against premature optimization.', ARRAY['memo','render','callback','props','dependency']::text[], ARRAY[]::uuid[], 'primary', true, 33),
  ('7ee0e030-5ad3-4a55-be2e-eb47dc353885'::uuid, 'frontend_engineer', 'How do stacking contexts and z-index work at a high level?', 'z-index applies within a stacking context created by positioning/opacity/transform etc. Unexpected overlays often mean a new stacking context, not a bigger z-index number.

Debugging tip: isolate in DevTools.', ARRAY['stacking','overlay','context','zindex']::text[], ARRAY[]::uuid[], 'primary', true, 34),
  ('1f125871-d435-458e-b641-7df590d479f9'::uuid, 'frontend_engineer', 'What is XSS, and how do you prevent it in frontend apps?', 'XSS injects malicious scripts into pages. Prevent via output encoding, avoiding dangerous HTML APIs, CSP, and careful Markdown rendering. Frameworks help but are not magic.

Relate to user-generated content.', ARRAY['xss','sanitize','escape','html','injection']::text[], ARRAY[]::uuid[], 'primary', true, 35),
  ('d44f29ed-dbc5-482d-88c2-114607aab100'::uuid, 'frontend_engineer', 'Which frontend craft are you strongest in—CSS architecture, JS systems, or design-system work—and evidence?', 'Pick one with a portfolio story and metrics. Acknowledge growth areas and how you collaborate with specialists.

Self-awareness beats claiming all strengths.', ARRAY['architecture','accessibility','component','evidence']::text[], ARRAY[]::uuid[], 'primary', true, 36),
  ('27f8baf7-30f4-47d1-98b4-ce7b5ab2889f'::uuid, 'frontend_engineer', 'Explain CORS at a high level from the browser’s perspective.', 'Browsers restrict cross-origin requests; servers opt in via Access-Control-* headers. Preflight OPTIONS for non-simple requests. Frontend cannot “fix” CORS safely—correct server config.

Debugging tip: distinguish network failure vs CORS error.', ARRAY['cors','preflight','origin','header','credential']::text[], ARRAY[]::uuid[], 'primary', true, 37),
  ('282b24a7-af12-48c0-aba4-e24e6b4ee464'::uuid, 'frontend_engineer', 'How do you approach cross-browser and device testing?', 'Define supported browser matrix, use automated e2e on key browsers, real-device checks for mobile gestures, and progressive enhancement.

Document known gaps.', ARRAY['browser','device','viewport','regression','safari']::text[], ARRAY[]::uuid[], 'primary', true, 38),
  ('ac8f96b3-45f1-4b58-9f16-58f6f9c65c7a'::uuid, 'frontend_engineer', 'Describe shipping a design system component used by multiple teams.', 'STAR: API design, accessibility, documentation, versioning, migration support, and adoption metrics. Discuss backwards compatibility.

Shows senior FE product thinking.', ARRAY['token','accessibility','version','consumer','component']::text[], ARRAY[]::uuid[], 'primary', true, 39)
;

insert into public.forge_v2_questions (id, profile_id, prompt, sample_answer, keywords, related_ids, kind, active, sort_order)
values
  ('53f5ad1f-88eb-464a-8860-388ea30d675b'::uuid, 'software_engineer', 'Why do you want to work as a software engineer at this company?', 'Connect your experience to the company’s products, users, and engineering challenges—cite a specific product behaviour or tech blog insight. Explain how the role’s scope (product eng, platform, etc.) matches skills you want to deepen.

Close with mutual fit: what you deliver in the first 6–12 months and what you hope to learn. Avoid generic “great culture” without evidence.', ARRAY['product','users','platform','challenges','scope']::text[], ARRAY[]::uuid[], 'primary', true, 0),
  ('bd0ba88d-cfd7-47d5-abbf-536cd565ed8b'::uuid, 'software_engineer', 'Walk me through your résumé, focusing on impact.', 'Narrate 2–3 roles/projects with the formula: problem → your actions → measurable result (latency, revenue, reliability, users). Keep each to ~1 minute.

Invite deeper dives. Interviewers use this to choose follow-up technical threads.', ARRAY['impact','latency','reliability','measurable','result']::text[], ARRAY[]::uuid[], 'primary', true, 1),
  ('ba9ca115-d7d0-457f-b175-027f3ab3a92c'::uuid, 'software_engineer', 'Tell me about a time you disagreed with a teammate or manager about a technical decision.', 'STAR: disagreement topic, how you sought to understand their constraints, data or prototype you brought, how you committed after a decision, and outcome.

Emphasize “disagree and commit” professionalism and user impact.', ARRAY['disagree','constraints','commit','decision','outcome']::text[], ARRAY[]::uuid[], 'primary', true, 2),
  ('9778f4c4-b446-469a-b17a-a4127e399c86'::uuid, 'software_engineer', 'Describe a time you dealt with ambiguity on a project.', 'Explain how you clarified success metrics, listed unknowns, ran a time-boxed spike, and delivered an incremental milestone. Quantify reduced uncertainty.

Ambiguity handling is a frequent FAANG-style behavioural theme.', ARRAY['ambiguity','metrics','unknowns','spike','milestone']::text[], ARRAY[]::uuid[], 'primary', true, 3),
  ('b5320ab7-b677-4d77-b3f0-fcbf434867b5'::uuid, 'software_engineer', 'Tell me about a production incident you helped resolve.', 'STAR: detection, mitigation to restore service, root-cause analysis, permanent fix, and follow-up (runbook, tests, dashboards). Stress communication during the incident.

Show calm ownership rather than blame.', ARRAY['incident','mitigation','cause','runbook','dashboard']::text[], ARRAY[]::uuid[], 'primary', true, 4),
  ('6de0eb99-eec1-43b8-a8bf-15f488473950'::uuid, 'software_engineer', 'Give an example of receiving critical code review feedback and how you responded.', 'Describe the feedback, what was valid, changes you made, and how it improved later reviews. If you disagreed, explain how you discussed trade-offs respectfully.

Growth mindset is the signal.', ARRAY['review','feedback','tradeoff','improved','respectful']::text[], ARRAY[]::uuid[], 'primary', true, 5),
  ('d8830bd9-53dd-42d3-ba48-5d6c35e2bc42'::uuid, 'software_engineer', 'Tell me about a time you mentored someone or raised the engineering bar.', 'Actions might include pairing, design docs, improving CI, or documenting onboarding. Result: mentee independence or fewer repeated bugs.

Leadership without title matters at mid levels.', ARRAY['mentoring','pairing','onboarding','mentee','documentation']::text[], ARRAY[]::uuid[], 'primary', true, 6),
  ('41f8a25a-bcbc-4858-b7cc-8aaa48ad6f8d'::uuid, 'software_engineer', 'Describe a deadline trade-off: how did you protect quality while shipping?', 'Explain options considered (cut scope, feature flags, defer non-critical polish), risk assessment, stakeholder alignment, and post-ship follow-up.

Show product sense + engineering integrity.', ARRAY['deadline','scope','quality','stakeholders','flag']::text[], ARRAY[]::uuid[], 'primary', true, 7),
  ('11d0fc03-567c-41cb-a5cb-0825c2a602e7'::uuid, 'software_engineer', 'How do you approach a new coding interview problem on the whiteboard or editor?', 'Restate requirements, ask about constraints and edge cases, work an example, propose brute force, analyze complexity, then optimize. Narrate trade-offs and test the final approach.

This meta-answer is itself frequently evaluated.', ARRAY['constraints','edge','brute','complexity','optimize']::text[], ARRAY[]::uuid[], 'primary', true, 8),
  ('92dac062-8633-4930-a85f-2a5457fe88fd'::uuid, 'software_engineer', 'Implement or outline how to find whether two strings are anagrams. Discuss complexity.', 'Sort both O(n log n) or count characters O(n) with fixed alphabet. Discuss Unicode caveats and early exit on length mismatch.

Clean communication + complexity is the bar.', ARRAY['anagram','sorting','characters','unicode','complexity']::text[], ARRAY[]::uuid[], 'primary', true, 9),
  ('b549b8ea-dc6c-40ed-ab1d-127c01ee52f5'::uuid, 'software_engineer', 'Explain BFS vs DFS. When is each preferable?', 'BFS explores by layers—good for shortest paths in unweighted graphs. DFS explores deep paths—good for cycle detection, topological patterns, path existence.

Discuss recursion stack limits vs explicit stacks/queues and graph representations.', ARRAY['bfs','dfs','shortest','cycle','graph','queue']::text[], ARRAY[]::uuid[], 'primary', true, 10),
  ('53509e32-751d-41bf-83dc-42745404f277'::uuid, 'software_engineer', 'How would you detect duplicates in a large stream of IDs with limited memory?', 'Discuss hash sets when memory allows; otherwise Bloom filters (probabilistic), external sort + scan, or partitioning by hash to disk.

Show ability to adapt algorithms to constraints—SWE interview staple.', ARRAY['duplicate','bloom','memory','stream','partition','hash']::text[], ARRAY[]::uuid[], 'primary', true, 11),
  ('675823dd-01df-449c-9f9d-b830f654eb7e'::uuid, 'software_engineer', 'Compare arrays, linked lists, and dynamic arrays (vectors). Practical trade-offs?', 'Arrays: contiguous, O(1) index, costly insert mid. Linked lists: O(1) insert given pointer, poor cache locality. Dynamic arrays: amortized append, occasional resize.

Relate to real language structures (ArrayList, slice).', ARRAY['array','linked','cache','insert','amortized','contiguous']::text[], ARRAY[]::uuid[], 'primary', true, 12),
  ('05702635-70b7-4db9-bf7f-50827610e9f3'::uuid, 'software_engineer', 'When would you use a heap / priority queue?', 'Use for repeated retrieval of min/max: Dijkstra, scheduling, streaming top-k. Describe sift operations at high level and O(log n) updates.

Give a production-flavoured example (job scheduler).', ARRAY['heap','priority','dijkstra','scheduler','ranking']::text[], ARRAY[]::uuid[], 'primary', true, 13),
  ('537562ab-c6d8-47d4-b15f-3addc7923639'::uuid, 'software_engineer', 'Explain hash tables: collision strategies and load factor.', 'Cover chaining vs open addressing, load factor impact on performance, and need for good hash functions. Mention resizing costs.

Discuss when keys are adversarial and you need stronger hashing.', ARRAY['hash','collision','chaining','load','factor']::text[], ARRAY[]::uuid[], 'primary', true, 14),
  ('7184f209-af82-441c-8b36-d4d4b4cbd202'::uuid, 'software_engineer', 'Design a URL shortener. What components and failure modes do you consider?', 'Requirements, API, ID generation, storage, cache, redirects, analytics. Discuss uniqueness, hot keys, and monitoring. Scale reads with caching/CDN.

Classic SWE system design prompt.', ARRAY['shortener','redirect','cache','uniqueness','scale']::text[], ARRAY[]::uuid[], 'primary', true, 15),
  ('8f4529b7-5497-4605-b2f7-46059a008b47'::uuid, 'software_engineer', 'How would you design a rate limiter for an API?', 'Clarify limits (per user/IP), algorithms (token bucket, sliding window), storage (Redis), and response behaviour (429 + headers). Discuss distributed coordination and bypass for internal traffic.

Tie to fairness and abuse prevention.', ARRAY['bucket','limiter','fairness','distributed','headers']::text[], ARRAY[]::uuid[], 'primary', true, 16),
  ('c39c04a1-925f-4726-b9cc-26ef2a59d7d3'::uuid, 'software_engineer', 'Explain horizontal vs vertical scaling and when you choose each.', 'Vertical: bigger machine—simpler but capped. Horizontal: more nodes—needs statelessness, sharding, load balancing. Discuss cost, failure domains, and operational complexity.

Give an example from a service you know.', ARRAY['horizontal','vertical','scaling','balancer','capacity']::text[], ARRAY[]::uuid[], 'primary', true, 17),
  ('e0c12b8c-4f44-4e23-8e9a-64f0871c23ef'::uuid, 'software_engineer', 'What is idempotency, and why does it matter for APIs?', 'Idempotent operations can be retried safely without duplicating side effects. Payment charges need idempotency keys so timeouts do not double-bill.

Explain server-side storage of request keys and responses.', ARRAY['idempotency','retry','duplicate','payment','request']::text[], ARRAY[]::uuid[], 'primary', true, 18),
  ('3db2ed23-2670-48c4-9f05-a552eb45d0f4'::uuid, 'software_engineer', 'How do you write a good design document?', 'Context, goals/non-goals, proposals considered, detailed design, data model/API, risks, rollout/monitoring, and open questions. Keep it reviewable and decision-oriented.

Share a time a design doc prevented rework.', ARRAY['document','goals','alternatives','tradeoffs','review']::text[], ARRAY[]::uuid[], 'primary', true, 19),
  ('3e941ffd-c36a-4b9d-a55f-4181ab1b2f93'::uuid, 'software_engineer', 'What makes a pull request easy to review?', 'Small focused diffs, clear description, test plan, screenshots for UI, and self-review first. Avoid drive-by refactors mixed with features.

Mentions CI green and risk notes.', ARRAY['pull','diff','description','tests','reviewer']::text[], ARRAY[]::uuid[], 'primary', true, 20),
  ('07a709ac-eef9-4046-ac4f-c4b63171ef39'::uuid, 'software_engineer', 'How do you approach technical debt versus new features?', 'Frame debt as risk/interest: prioritize by user impact and developer velocity. Propose budgeting capacity, measuring pain (build times, Sev frequency), and incremental paydown.

Speak to stakeholder communication.', ARRAY['debt','features','capacity','risk','refactor']::text[], ARRAY[]::uuid[], 'primary', true, 21),
  ('15b2ba23-a18d-4173-8cf9-6d9fb40425cf'::uuid, 'software_engineer', 'How do you decide what to unit test vs integration test vs e2e test?', 'Pyramid: many fast unit tests for logic; fewer integration tests for DB/API contracts; sparse e2e for critical user journeys. Discuss flakiness and cost.

Example from a past service.', ARRAY['unit','integration','contract','flaky','coverage']::text[], ARRAY[]::uuid[], 'primary', true, 22),
  ('4c68acbf-aa90-4b41-81cc-aa78325a84e8'::uuid, 'software_engineer', 'Describe your debugging process for an intermittent bug.', 'Reproduce reliably, gather logs/metrics/traces, form hypotheses, bisect changes, add instrumentation, fix, and add regression tests. Mention race conditions and environment parity.

Show scientific method.', ARRAY['intermittent','reproduce','logs','hypothesis','debugger']::text[], ARRAY[]::uuid[], 'primary', true, 23),
  ('46a8851d-4a8d-4015-b3ea-6bd2a7b13afd'::uuid, 'software_engineer', 'What are edge cases you always consider in coding problems?', 'Empty inputs, nulls, duplicates, overflow, negative numbers, Unicode, concurrency, and maximum constraints. State how you document assumptions.

Interviewers watch for proactive edge-case coverage.', ARRAY['empty','null','overflow','concurrency','boundary']::text[], ARRAY[]::uuid[], 'primary', true, 24),
  ('1da54819-3f8b-4ec4-b72f-dda8e87ababf'::uuid, 'software_engineer', 'How do you communicate project status to non-engineering stakeholders?', 'Use outcomes and risks, not jargon: milestone progress, blockers, decisions needed, and options with trade-offs. Visuals/timelines help.

Give a STAR example of aligning a delayed launch.', ARRAY['stakeholder','status','blocker','outcome','jargon']::text[], ARRAY[]::uuid[], 'primary', true, 25),
  ('f7d124c8-475d-493c-a96a-3c8929d7f836'::uuid, 'software_engineer', 'Tell me about a time you influenced a technical decision without authority.', 'Describe building shared understanding via prototypes, RFCs, or customer evidence. Result: adopted approach and relationship trust.

Influence is a mid/senior SWE signal.', ARRAY['influence','proposal','prototype','consensus','rfc']::text[], ARRAY[]::uuid[], 'primary', true, 26),
  ('e3b7a805-209f-466d-be5a-d479e21078d8'::uuid, 'software_engineer', 'Outline how you would merge k sorted lists efficiently.', 'Use a min-heap of size k for O(n log k). Contrast with pairwise merging. Discuss memory and streaming variants.

Classic heap + lists crossover question.', ARRAY['merge','sorted','heap','complexity','lists']::text[], ARRAY[]::uuid[], 'primary', true, 27),
  ('5fd2fe24-2feb-4732-a22f-17a70555b99b'::uuid, 'software_engineer', 'How does a binary search tree differ from a balanced BST (e.g., AVL/red-black) in practice?', 'Unbalanced BSTs can degrade to O(n). Balanced trees guarantee O(log n) ops. Discuss when hash maps beat trees (unordered) vs when sorted order matters.

Practical performance awareness matters.', ARRAY['balanced','rotation','height','avl','rebalance']::text[], ARRAY[]::uuid[], 'primary', true, 28),
  ('3b9b1541-03f7-4096-9158-283dc94f9ddf'::uuid, 'software_engineer', 'Explain CAP and give a real product example of prioritizing availability vs consistency.', 'Under partition, choose AP (serve possibly stale reads) or CP (refuse/unavailable until consistent). Example: social feed freshness vs inventory reservation.

Clarify that partitions are real in WANs.', ARRAY['availability','consistency','partition','inventory','reservation']::text[], ARRAY[]::uuid[], 'primary', true, 29),
  ('81678891-59cb-4722-af08-b26da56537e2'::uuid, 'software_engineer', 'How do you ensure observability for a new service?', 'Define SLIs/SLOs, structured logs, metrics (RED/USE), traces, and actionable alerts. Include dashboards before launch and load tests.

Tie alerts to user impact, not only CPU.', ARRAY['metrics','traces','alerts','dashboard','latency']::text[], ARRAY[]::uuid[], 'primary', true, 30),
  ('fef7902c-0338-445c-9bd8-d1f13386a317'::uuid, 'software_engineer', 'What are you looking for in your next engineering role?', 'Discuss problem scope, mentorship/growth, tech stack learning, and impact. Align honestly with the posting without contradicting your résumé.

Ask a thoughtful question back.', ARRAY['growth','mentorship','ownership','learning','team']::text[], ARRAY[]::uuid[], 'primary', true, 31),
  ('4f7f1f4e-ac77-4ce6-9e69-84c2bf86e9f9'::uuid, 'software_engineer', 'Tell me about a time you made a mistake in production. What did you learn?', 'Own it, explain blast radius control, fix, communication, and systemic prevention (canary, better tests). Avoid self-flagellation without learning.

Integrity + engineering maturity.', ARRAY['mistake','rollback','canary','postmortem','blast']::text[], ARRAY[]::uuid[], 'primary', true, 32),
  ('a8d0f327-1f80-4cd2-8531-32858b2b0f4c'::uuid, 'software_engineer', 'Explain quicksort vs mergesort trade-offs.', 'Quicksort: average O(n log n), in-place variants, poor worst case without care. Mergesort: stable O(n log n) guaranteed, needs extra memory.

Discuss practical library choices and adversarial inputs.', ARRAY['quicksort','mergesort','pivot','stable','memory']::text[], ARRAY[]::uuid[], 'primary', true, 33),
  ('21131e22-f270-40f2-bb17-eefe541ea042'::uuid, 'software_engineer', 'How would you approach designing a news feed or timeline at high level?', 'Clarify ranking vs chronological, fan-out on write vs read, caching, and personalization. Discuss celebrity hot keys and eventual consistency.

Stay structured: requirements → API → storage → bottlenecks.', ARRAY['feed','fanout','ranking','cache','timeline']::text[], ARRAY[]::uuid[], 'primary', true, 34),
  ('37b9aeb3-1cc7-4983-b0da-058be49d7414'::uuid, 'software_engineer', 'What is flaky test hygiene, and why does it matter?', 'Flakes erode trust in CI. Practices: quarantine, fix root causes (time/order/dependency), deterministic seeds, and retry policies used sparingly.

Cultural bar for quality engineering.', ARRAY['flaky','quarantine','deterministic','pipeline','retry']::text[], ARRAY[]::uuid[], 'primary', true, 35),
  ('397c24fc-8eaf-4aee-a1c1-bb96a79ea1d9'::uuid, 'software_engineer', 'How do you onboard onto an unfamiliar codebase quickly?', 'Read architecture docs, run the app, trace a request path, make a small safe change, ask targeted questions, and document findings.

Show a past ramp-up timeline with impact.', ARRAY['codebase','architecture','trace','documentation','change']::text[], ARRAY[]::uuid[], 'primary', true, 36),
  ('6149cd3e-e8cd-43bf-99e2-21bd0f07873f'::uuid, 'software_engineer', 'Explain feature flags and their risks.', 'Flags decouple deploy from release, enable canaries and experiments. Risks: flag debt, complex combinations, security if misconfigured.

Describe cleanup ownership.', ARRAY['flag','rollout','canary','cleanup','experiment']::text[], ARRAY[]::uuid[], 'primary', true, 37),
  ('13480c1a-8516-470f-9626-ea6828e405c0'::uuid, 'software_engineer', 'How do you find the k-th largest element in an unsorted array?', 'Quickselect average O(n), heap O(n log k), full sort O(n log n). Discuss worst cases and practical constants.

State which you’d pick under interview constraints.', ARRAY['quickselect','heap','partition','largest','complexity']::text[], ARRAY[]::uuid[], 'primary', true, 38),
  ('2849582e-19fe-479e-b415-8051cbf0348b'::uuid, 'software_engineer', 'Do you have questions for us about the team’s engineering practices?', 'Ask about code review norms, on-call, deployment frequency, quality metrics, or how tech strategy decisions are made. Show you evaluate employers too.

Prepared questions signal seniority of approach.', ARRAY['oncall','testing','deployment','review','practices']::text[], ARRAY[]::uuid[], 'primary', true, 39)
;

update public.forge_v2_questions as q
set related_ids = v.related_ids
from (values
  ('797f09b1-be8f-4873-b0e6-a94174e4ad5d'::uuid, ARRAY['6243cc79-6d99-4e0b-9f46-a5de8523d742'::uuid,'606a720e-b753-487f-b16f-61695f44708e'::uuid,'393450d2-f686-435a-85a8-651119b8d932'::uuid]::uuid[]),
  ('6243cc79-6d99-4e0b-9f46-a5de8523d742'::uuid, ARRAY['606a720e-b753-487f-b16f-61695f44708e'::uuid,'393450d2-f686-435a-85a8-651119b8d932'::uuid,'6326982e-1644-4513-bd0d-afe856e20930'::uuid]::uuid[]),
  ('9add3916-26ae-49e0-af67-9a68225ccb57'::uuid, ARRAY['eaaf8175-7d61-4547-bbdc-3eed7f4a5e84'::uuid,'761bc4e1-3442-4f81-b439-f255763b5724'::uuid,'06c1ab9b-ad01-4d1a-b53c-84ede6b2cb04'::uuid]::uuid[]),
  ('eaaf8175-7d61-4547-bbdc-3eed7f4a5e84'::uuid, ARRAY['761bc4e1-3442-4f81-b439-f255763b5724'::uuid,'06c1ab9b-ad01-4d1a-b53c-84ede6b2cb04'::uuid,'c480325a-990a-4ce2-bac3-f3e01b57df31'::uuid]::uuid[]),
  ('761bc4e1-3442-4f81-b439-f255763b5724'::uuid, ARRAY['06c1ab9b-ad01-4d1a-b53c-84ede6b2cb04'::uuid,'c480325a-990a-4ce2-bac3-f3e01b57df31'::uuid,'1f63d15a-f8af-406a-995d-f63a090eec3a'::uuid]::uuid[]),
  ('06c1ab9b-ad01-4d1a-b53c-84ede6b2cb04'::uuid, ARRAY['c480325a-990a-4ce2-bac3-f3e01b57df31'::uuid,'1f63d15a-f8af-406a-995d-f63a090eec3a'::uuid,'c710e1ba-4b53-4da3-9e9a-23c5d81a22ef'::uuid]::uuid[]),
  ('c480325a-990a-4ce2-bac3-f3e01b57df31'::uuid, ARRAY['1f63d15a-f8af-406a-995d-f63a090eec3a'::uuid,'c710e1ba-4b53-4da3-9e9a-23c5d81a22ef'::uuid,'9add3916-26ae-49e0-af67-9a68225ccb57'::uuid]::uuid[]),
  ('9f111241-1cac-4eb4-8f26-eac96fe2374c'::uuid, ARRAY['c47c109c-d492-4c1b-bffb-eb180e47b7a8'::uuid,'ab2b0cab-77ac-4ee2-9670-6415d54adccf'::uuid,'76d1a02c-c8b3-4714-985a-42f5e9c60199'::uuid]::uuid[]),
  ('c47c109c-d492-4c1b-bffb-eb180e47b7a8'::uuid, ARRAY['ab2b0cab-77ac-4ee2-9670-6415d54adccf'::uuid,'76d1a02c-c8b3-4714-985a-42f5e9c60199'::uuid,'219c7155-a525-4e52-ac92-9835b1dcd03c'::uuid]::uuid[]),
  ('ab2b0cab-77ac-4ee2-9670-6415d54adccf'::uuid, ARRAY['76d1a02c-c8b3-4714-985a-42f5e9c60199'::uuid,'219c7155-a525-4e52-ac92-9835b1dcd03c'::uuid,'40672f52-723d-494d-81e0-563503b2d60e'::uuid]::uuid[]),
  ('76d1a02c-c8b3-4714-985a-42f5e9c60199'::uuid, ARRAY['219c7155-a525-4e52-ac92-9835b1dcd03c'::uuid,'40672f52-723d-494d-81e0-563503b2d60e'::uuid,'93343656-1a76-42d3-a281-a9d365eee706'::uuid]::uuid[]),
  ('219c7155-a525-4e52-ac92-9835b1dcd03c'::uuid, ARRAY['40672f52-723d-494d-81e0-563503b2d60e'::uuid,'93343656-1a76-42d3-a281-a9d365eee706'::uuid,'9f111241-1cac-4eb4-8f26-eac96fe2374c'::uuid]::uuid[]),
  ('40672f52-723d-494d-81e0-563503b2d60e'::uuid, ARRAY['93343656-1a76-42d3-a281-a9d365eee706'::uuid,'9f111241-1cac-4eb4-8f26-eac96fe2374c'::uuid,'c47c109c-d492-4c1b-bffb-eb180e47b7a8'::uuid]::uuid[]),
  ('53cc42ba-51f3-4dcb-ba44-237c3fe28236'::uuid, ARRAY['61e8eb85-b69f-4411-937b-6deddd430504'::uuid,'0666ef86-d53b-4067-888f-aa8338951974'::uuid,'a305e34e-67db-4b5a-9fb2-444850d4e20c'::uuid]::uuid[]),
  ('61e8eb85-b69f-4411-937b-6deddd430504'::uuid, ARRAY['0666ef86-d53b-4067-888f-aa8338951974'::uuid,'a305e34e-67db-4b5a-9fb2-444850d4e20c'::uuid,'4a18e258-c485-40e6-bf32-d127c844755e'::uuid]::uuid[]),
  ('0666ef86-d53b-4067-888f-aa8338951974'::uuid, ARRAY['a305e34e-67db-4b5a-9fb2-444850d4e20c'::uuid,'4a18e258-c485-40e6-bf32-d127c844755e'::uuid,'9b998b94-02fa-404d-97ba-e48c2d270790'::uuid]::uuid[]),
  ('a305e34e-67db-4b5a-9fb2-444850d4e20c'::uuid, ARRAY['4a18e258-c485-40e6-bf32-d127c844755e'::uuid,'9b998b94-02fa-404d-97ba-e48c2d270790'::uuid,'5ff80341-3d90-4d4c-a568-71838e846a34'::uuid]::uuid[]),
  ('4a18e258-c485-40e6-bf32-d127c844755e'::uuid, ARRAY['9b998b94-02fa-404d-97ba-e48c2d270790'::uuid,'5ff80341-3d90-4d4c-a568-71838e846a34'::uuid,'5aa891f9-e913-48d0-9cff-3824a35c373e'::uuid]::uuid[]),
  ('a6d85ade-fb0c-41b9-aefc-2d3bf02dc777'::uuid, ARRAY['99dfc90a-ed26-444c-8896-72a7d6ecff7c'::uuid,'cf3aa920-a235-46cb-87ae-a69029e2267f'::uuid,'e917c694-d806-499d-a6e6-3bf9d22effd9'::uuid]::uuid[]),
  ('99dfc90a-ed26-444c-8896-72a7d6ecff7c'::uuid, ARRAY['cf3aa920-a235-46cb-87ae-a69029e2267f'::uuid,'e917c694-d806-499d-a6e6-3bf9d22effd9'::uuid,'a6d85ade-fb0c-41b9-aefc-2d3bf02dc777'::uuid]::uuid[]),
  ('9b998b94-02fa-404d-97ba-e48c2d270790'::uuid, ARRAY['5ff80341-3d90-4d4c-a568-71838e846a34'::uuid,'5aa891f9-e913-48d0-9cff-3824a35c373e'::uuid,'af5702a6-c707-4454-85ca-e653366c95d2'::uuid]::uuid[]),
  ('5ff80341-3d90-4d4c-a568-71838e846a34'::uuid, ARRAY['5aa891f9-e913-48d0-9cff-3824a35c373e'::uuid,'af5702a6-c707-4454-85ca-e653366c95d2'::uuid,'bda2e26d-0ae8-419e-bead-320723802854'::uuid]::uuid[]),
  ('61346069-f504-4d4a-9b73-a1655095d27a'::uuid, ARRAY['df17d246-fe50-4981-b0ea-8c4e46339eb7'::uuid,'66a2b3a3-ab5f-4e18-ad62-ae32bb771840'::uuid]::uuid[]),
  ('df17d246-fe50-4981-b0ea-8c4e46339eb7'::uuid, ARRAY['66a2b3a3-ab5f-4e18-ad62-ae32bb771840'::uuid,'61346069-f504-4d4a-9b73-a1655095d27a'::uuid]::uuid[]),
  ('66a2b3a3-ab5f-4e18-ad62-ae32bb771840'::uuid, ARRAY['61346069-f504-4d4a-9b73-a1655095d27a'::uuid,'df17d246-fe50-4981-b0ea-8c4e46339eb7'::uuid]::uuid[]),
  ('6bfd148d-eb68-4642-a67b-9f606e6e52ca'::uuid, ARRAY['47f678af-f903-445f-a53f-1d20411a501b'::uuid,'92845e95-0249-48be-93fa-1b037ac3d936'::uuid]::uuid[]),
  ('47f678af-f903-445f-a53f-1d20411a501b'::uuid, ARRAY['92845e95-0249-48be-93fa-1b037ac3d936'::uuid,'6bfd148d-eb68-4642-a67b-9f606e6e52ca'::uuid]::uuid[]),
  ('1f63d15a-f8af-406a-995d-f63a090eec3a'::uuid, ARRAY['c710e1ba-4b53-4da3-9e9a-23c5d81a22ef'::uuid,'9add3916-26ae-49e0-af67-9a68225ccb57'::uuid,'eaaf8175-7d61-4547-bbdc-3eed7f4a5e84'::uuid]::uuid[]),
  ('5aa891f9-e913-48d0-9cff-3824a35c373e'::uuid, ARRAY['af5702a6-c707-4454-85ca-e653366c95d2'::uuid,'bda2e26d-0ae8-419e-bead-320723802854'::uuid,'b54f0f5f-2c13-4aa3-ae9b-c1ce2416905a'::uuid]::uuid[]),
  ('c710e1ba-4b53-4da3-9e9a-23c5d81a22ef'::uuid, ARRAY['9add3916-26ae-49e0-af67-9a68225ccb57'::uuid,'eaaf8175-7d61-4547-bbdc-3eed7f4a5e84'::uuid,'761bc4e1-3442-4f81-b439-f255763b5724'::uuid]::uuid[]),
  ('cf3aa920-a235-46cb-87ae-a69029e2267f'::uuid, ARRAY['e917c694-d806-499d-a6e6-3bf9d22effd9'::uuid,'a6d85ade-fb0c-41b9-aefc-2d3bf02dc777'::uuid,'99dfc90a-ed26-444c-8896-72a7d6ecff7c'::uuid]::uuid[]),
  ('e917c694-d806-499d-a6e6-3bf9d22effd9'::uuid, ARRAY['a6d85ade-fb0c-41b9-aefc-2d3bf02dc777'::uuid,'99dfc90a-ed26-444c-8896-72a7d6ecff7c'::uuid,'cf3aa920-a235-46cb-87ae-a69029e2267f'::uuid]::uuid[]),
  ('af5702a6-c707-4454-85ca-e653366c95d2'::uuid, ARRAY['bda2e26d-0ae8-419e-bead-320723802854'::uuid,'b54f0f5f-2c13-4aa3-ae9b-c1ce2416905a'::uuid,'53cc42ba-51f3-4dcb-ba44-237c3fe28236'::uuid]::uuid[]),
  ('bda2e26d-0ae8-419e-bead-320723802854'::uuid, ARRAY['b54f0f5f-2c13-4aa3-ae9b-c1ce2416905a'::uuid,'53cc42ba-51f3-4dcb-ba44-237c3fe28236'::uuid,'61e8eb85-b69f-4411-937b-6deddd430504'::uuid]::uuid[]),
  ('93343656-1a76-42d3-a281-a9d365eee706'::uuid, ARRAY['9f111241-1cac-4eb4-8f26-eac96fe2374c'::uuid,'c47c109c-d492-4c1b-bffb-eb180e47b7a8'::uuid,'ab2b0cab-77ac-4ee2-9670-6415d54adccf'::uuid]::uuid[]),
  ('606a720e-b753-487f-b16f-61695f44708e'::uuid, ARRAY['393450d2-f686-435a-85a8-651119b8d932'::uuid,'6326982e-1644-4513-bd0d-afe856e20930'::uuid,'797f09b1-be8f-4873-b0e6-a94174e4ad5d'::uuid]::uuid[]),
  ('b54f0f5f-2c13-4aa3-ae9b-c1ce2416905a'::uuid, ARRAY['53cc42ba-51f3-4dcb-ba44-237c3fe28236'::uuid,'61e8eb85-b69f-4411-937b-6deddd430504'::uuid,'0666ef86-d53b-4067-888f-aa8338951974'::uuid]::uuid[]),
  ('393450d2-f686-435a-85a8-651119b8d932'::uuid, ARRAY['6326982e-1644-4513-bd0d-afe856e20930'::uuid,'797f09b1-be8f-4873-b0e6-a94174e4ad5d'::uuid,'6243cc79-6d99-4e0b-9f46-a5de8523d742'::uuid]::uuid[]),
  ('92845e95-0249-48be-93fa-1b037ac3d936'::uuid, ARRAY['6bfd148d-eb68-4642-a67b-9f606e6e52ca'::uuid,'47f678af-f903-445f-a53f-1d20411a501b'::uuid]::uuid[]),
  ('6326982e-1644-4513-bd0d-afe856e20930'::uuid, ARRAY['797f09b1-be8f-4873-b0e6-a94174e4ad5d'::uuid,'6243cc79-6d99-4e0b-9f46-a5de8523d742'::uuid,'606a720e-b753-487f-b16f-61695f44708e'::uuid]::uuid[]),
  ('ce4004a3-cbba-4271-bdd5-8a3192b8a5a5'::uuid, ARRAY['6ac487fb-8306-4f06-9141-21b4828493cc'::uuid,'41cd7e68-2a29-4820-a558-4e0569334597'::uuid,'9d1f4328-82eb-4f61-82da-24846b9d51a2'::uuid]::uuid[]),
  ('6ac487fb-8306-4f06-9141-21b4828493cc'::uuid, ARRAY['41cd7e68-2a29-4820-a558-4e0569334597'::uuid,'9d1f4328-82eb-4f61-82da-24846b9d51a2'::uuid,'86d35564-8426-4ec3-b9b9-0860448e64da'::uuid]::uuid[]),
  ('41cd7e68-2a29-4820-a558-4e0569334597'::uuid, ARRAY['9d1f4328-82eb-4f61-82da-24846b9d51a2'::uuid,'86d35564-8426-4ec3-b9b9-0860448e64da'::uuid,'3027a2ad-e7d1-486b-aa6c-0e559cbba27b'::uuid]::uuid[]),
  ('9d1f4328-82eb-4f61-82da-24846b9d51a2'::uuid, ARRAY['86d35564-8426-4ec3-b9b9-0860448e64da'::uuid,'3027a2ad-e7d1-486b-aa6c-0e559cbba27b'::uuid,'51921879-b730-45c5-b905-19efedfa23b1'::uuid]::uuid[]),
  ('86d35564-8426-4ec3-b9b9-0860448e64da'::uuid, ARRAY['3027a2ad-e7d1-486b-aa6c-0e559cbba27b'::uuid,'51921879-b730-45c5-b905-19efedfa23b1'::uuid,'bd54d619-750e-4dc5-b03b-12e67dd2119f'::uuid]::uuid[]),
  ('3027a2ad-e7d1-486b-aa6c-0e559cbba27b'::uuid, ARRAY['51921879-b730-45c5-b905-19efedfa23b1'::uuid,'bd54d619-750e-4dc5-b03b-12e67dd2119f'::uuid,'924d426d-908d-4362-a5d4-b97dda473a19'::uuid]::uuid[]),
  ('daea4728-fc65-49f5-8ec6-01c304e01cab'::uuid, ARRAY['24ea662a-8a87-43b3-88cb-df7d0006e6bb'::uuid,'b79df4c4-1780-4bbb-8bf2-55aadd229c3e'::uuid,'46bca7c9-cab3-48fa-a4d9-26a031d41bf6'::uuid]::uuid[]),
  ('24ea662a-8a87-43b3-88cb-df7d0006e6bb'::uuid, ARRAY['b79df4c4-1780-4bbb-8bf2-55aadd229c3e'::uuid,'46bca7c9-cab3-48fa-a4d9-26a031d41bf6'::uuid,'5d9eccbf-c7e0-48d7-9e32-df9c972e98ae'::uuid]::uuid[]),
  ('b79df4c4-1780-4bbb-8bf2-55aadd229c3e'::uuid, ARRAY['46bca7c9-cab3-48fa-a4d9-26a031d41bf6'::uuid,'5d9eccbf-c7e0-48d7-9e32-df9c972e98ae'::uuid,'daea4728-fc65-49f5-8ec6-01c304e01cab'::uuid]::uuid[]),
  ('45b784e5-8a8a-4873-9e12-64088bd9a949'::uuid, ARRAY['bdb2b666-53b4-4f74-9148-21c1b44132d0'::uuid,'e253580b-3913-48a5-b63c-7967f2fe591f'::uuid,'a31e63c1-095b-4830-b981-26955cd24226'::uuid]::uuid[]),
  ('bdb2b666-53b4-4f74-9148-21c1b44132d0'::uuid, ARRAY['e253580b-3913-48a5-b63c-7967f2fe591f'::uuid,'a31e63c1-095b-4830-b981-26955cd24226'::uuid,'5bdc17d3-9e8d-4e84-88bd-954692c0b821'::uuid]::uuid[]),
  ('e253580b-3913-48a5-b63c-7967f2fe591f'::uuid, ARRAY['a31e63c1-095b-4830-b981-26955cd24226'::uuid,'5bdc17d3-9e8d-4e84-88bd-954692c0b821'::uuid,'18bf8ccc-4516-475d-bebf-873386dc5758'::uuid]::uuid[]),
  ('a31e63c1-095b-4830-b981-26955cd24226'::uuid, ARRAY['5bdc17d3-9e8d-4e84-88bd-954692c0b821'::uuid,'18bf8ccc-4516-475d-bebf-873386dc5758'::uuid,'de2f3455-a795-4b8e-b116-fe9af2cbb471'::uuid]::uuid[]),
  ('5bdc17d3-9e8d-4e84-88bd-954692c0b821'::uuid, ARRAY['18bf8ccc-4516-475d-bebf-873386dc5758'::uuid,'de2f3455-a795-4b8e-b116-fe9af2cbb471'::uuid,'cecb1802-a8d1-4ba7-85f6-18ad9343eb9a'::uuid]::uuid[]),
  ('18bf8ccc-4516-475d-bebf-873386dc5758'::uuid, ARRAY['de2f3455-a795-4b8e-b116-fe9af2cbb471'::uuid,'cecb1802-a8d1-4ba7-85f6-18ad9343eb9a'::uuid,'5258da48-f3a2-4fd6-8aed-6371b0d28016'::uuid]::uuid[]),
  ('de2f3455-a795-4b8e-b116-fe9af2cbb471'::uuid, ARRAY['cecb1802-a8d1-4ba7-85f6-18ad9343eb9a'::uuid,'5258da48-f3a2-4fd6-8aed-6371b0d28016'::uuid,'6867470d-3fe1-4a54-88f5-710a6eaf77cf'::uuid]::uuid[]),
  ('32784c0c-ca21-4e45-a568-b7c6b2e1f7c8'::uuid, ARRAY['26a8d5aa-ca98-4805-b811-bc1ba972b0e6'::uuid,'2ea14939-3d34-48cd-a54c-35483aa11da7'::uuid,'883a4b04-ecd0-4fe6-af4e-1e3452ef90ee'::uuid]::uuid[]),
  ('cecb1802-a8d1-4ba7-85f6-18ad9343eb9a'::uuid, ARRAY['5258da48-f3a2-4fd6-8aed-6371b0d28016'::uuid,'6867470d-3fe1-4a54-88f5-710a6eaf77cf'::uuid,'45b784e5-8a8a-4873-9e12-64088bd9a949'::uuid]::uuid[]),
  ('5258da48-f3a2-4fd6-8aed-6371b0d28016'::uuid, ARRAY['6867470d-3fe1-4a54-88f5-710a6eaf77cf'::uuid,'45b784e5-8a8a-4873-9e12-64088bd9a949'::uuid,'bdb2b666-53b4-4f74-9148-21c1b44132d0'::uuid]::uuid[]),
  ('26a8d5aa-ca98-4805-b811-bc1ba972b0e6'::uuid, ARRAY['2ea14939-3d34-48cd-a54c-35483aa11da7'::uuid,'883a4b04-ecd0-4fe6-af4e-1e3452ef90ee'::uuid,'32784c0c-ca21-4e45-a568-b7c6b2e1f7c8'::uuid]::uuid[]),
  ('2ea14939-3d34-48cd-a54c-35483aa11da7'::uuid, ARRAY['883a4b04-ecd0-4fe6-af4e-1e3452ef90ee'::uuid,'32784c0c-ca21-4e45-a568-b7c6b2e1f7c8'::uuid,'26a8d5aa-ca98-4805-b811-bc1ba972b0e6'::uuid]::uuid[]),
  ('883a4b04-ecd0-4fe6-af4e-1e3452ef90ee'::uuid, ARRAY['32784c0c-ca21-4e45-a568-b7c6b2e1f7c8'::uuid,'26a8d5aa-ca98-4805-b811-bc1ba972b0e6'::uuid,'2ea14939-3d34-48cd-a54c-35483aa11da7'::uuid]::uuid[]),
  ('12769718-2225-4e18-b1b7-78f5121abf4b'::uuid, ARRAY['a95a92ec-e36f-4c2b-b338-d3fee641c22b'::uuid,'54e67f36-8969-40f1-966f-b27042e92b32'::uuid,'4856d8ff-e25e-40e5-8556-c28ad7663554'::uuid]::uuid[]),
  ('a95a92ec-e36f-4c2b-b338-d3fee641c22b'::uuid, ARRAY['54e67f36-8969-40f1-966f-b27042e92b32'::uuid,'4856d8ff-e25e-40e5-8556-c28ad7663554'::uuid,'521e74fd-1905-4a4e-b94d-af7894dbc5b6'::uuid]::uuid[]),
  ('54e67f36-8969-40f1-966f-b27042e92b32'::uuid, ARRAY['4856d8ff-e25e-40e5-8556-c28ad7663554'::uuid,'521e74fd-1905-4a4e-b94d-af7894dbc5b6'::uuid,'80305d5b-7c68-4a61-8226-48a8aed9264b'::uuid]::uuid[]),
  ('4856d8ff-e25e-40e5-8556-c28ad7663554'::uuid, ARRAY['521e74fd-1905-4a4e-b94d-af7894dbc5b6'::uuid,'80305d5b-7c68-4a61-8226-48a8aed9264b'::uuid,'eec57dc2-7e69-4d97-8b3d-72cbfb3988a2'::uuid]::uuid[]),
  ('521e74fd-1905-4a4e-b94d-af7894dbc5b6'::uuid, ARRAY['80305d5b-7c68-4a61-8226-48a8aed9264b'::uuid,'eec57dc2-7e69-4d97-8b3d-72cbfb3988a2'::uuid,'286e3dcb-0faf-4a5a-870d-4024459d9c70'::uuid]::uuid[]),
  ('80305d5b-7c68-4a61-8226-48a8aed9264b'::uuid, ARRAY['eec57dc2-7e69-4d97-8b3d-72cbfb3988a2'::uuid,'286e3dcb-0faf-4a5a-870d-4024459d9c70'::uuid,'12769718-2225-4e18-b1b7-78f5121abf4b'::uuid]::uuid[]),
  ('eec57dc2-7e69-4d97-8b3d-72cbfb3988a2'::uuid, ARRAY['286e3dcb-0faf-4a5a-870d-4024459d9c70'::uuid,'12769718-2225-4e18-b1b7-78f5121abf4b'::uuid,'a95a92ec-e36f-4c2b-b338-d3fee641c22b'::uuid]::uuid[]),
  ('4797a528-0ce9-4810-8929-0557037a1c3f'::uuid, ARRAY['37e541d8-1b57-482e-b7ee-e3a2485ab311'::uuid,'185179b4-52f1-4418-a001-d2b9945a0c1f'::uuid,'227e1a49-6879-4f07-a76e-e5011b0eb23b'::uuid]::uuid[]),
  ('37e541d8-1b57-482e-b7ee-e3a2485ab311'::uuid, ARRAY['185179b4-52f1-4418-a001-d2b9945a0c1f'::uuid,'227e1a49-6879-4f07-a76e-e5011b0eb23b'::uuid,'4797a528-0ce9-4810-8929-0557037a1c3f'::uuid]::uuid[]),
  ('185179b4-52f1-4418-a001-d2b9945a0c1f'::uuid, ARRAY['227e1a49-6879-4f07-a76e-e5011b0eb23b'::uuid,'4797a528-0ce9-4810-8929-0557037a1c3f'::uuid,'37e541d8-1b57-482e-b7ee-e3a2485ab311'::uuid]::uuid[]),
  ('227e1a49-6879-4f07-a76e-e5011b0eb23b'::uuid, ARRAY['4797a528-0ce9-4810-8929-0557037a1c3f'::uuid,'37e541d8-1b57-482e-b7ee-e3a2485ab311'::uuid,'185179b4-52f1-4418-a001-d2b9945a0c1f'::uuid]::uuid[]),
  ('46bca7c9-cab3-48fa-a4d9-26a031d41bf6'::uuid, ARRAY['5d9eccbf-c7e0-48d7-9e32-df9c972e98ae'::uuid,'daea4728-fc65-49f5-8ec6-01c304e01cab'::uuid,'24ea662a-8a87-43b3-88cb-df7d0006e6bb'::uuid]::uuid[]),
  ('51921879-b730-45c5-b905-19efedfa23b1'::uuid, ARRAY['bd54d619-750e-4dc5-b03b-12e67dd2119f'::uuid,'924d426d-908d-4362-a5d4-b97dda473a19'::uuid,'ce4004a3-cbba-4271-bdd5-8a3192b8a5a5'::uuid]::uuid[]),
  ('6867470d-3fe1-4a54-88f5-710a6eaf77cf'::uuid, ARRAY['45b784e5-8a8a-4873-9e12-64088bd9a949'::uuid,'bdb2b666-53b4-4f74-9148-21c1b44132d0'::uuid,'e253580b-3913-48a5-b63c-7967f2fe591f'::uuid]::uuid[]),
  ('5d9eccbf-c7e0-48d7-9e32-df9c972e98ae'::uuid, ARRAY['daea4728-fc65-49f5-8ec6-01c304e01cab'::uuid,'24ea662a-8a87-43b3-88cb-df7d0006e6bb'::uuid,'b79df4c4-1780-4bbb-8bf2-55aadd229c3e'::uuid]::uuid[]),
  ('bd54d619-750e-4dc5-b03b-12e67dd2119f'::uuid, ARRAY['924d426d-908d-4362-a5d4-b97dda473a19'::uuid,'ce4004a3-cbba-4271-bdd5-8a3192b8a5a5'::uuid,'6ac487fb-8306-4f06-9141-21b4828493cc'::uuid]::uuid[]),
  ('286e3dcb-0faf-4a5a-870d-4024459d9c70'::uuid, ARRAY['12769718-2225-4e18-b1b7-78f5121abf4b'::uuid,'a95a92ec-e36f-4c2b-b338-d3fee641c22b'::uuid,'54e67f36-8969-40f1-966f-b27042e92b32'::uuid]::uuid[]),
  ('924d426d-908d-4362-a5d4-b97dda473a19'::uuid, ARRAY['ce4004a3-cbba-4271-bdd5-8a3192b8a5a5'::uuid,'6ac487fb-8306-4f06-9141-21b4828493cc'::uuid,'41cd7e68-2a29-4820-a558-4e0569334597'::uuid]::uuid[]),
  ('12773583-f2e8-4273-b1a3-5e24924d4b5c'::uuid, ARRAY['2e6b90a7-1601-4101-a03b-a0b06cfeed52'::uuid,'5e05e51b-dd96-4e6f-95b1-e6fb73ab3683'::uuid,'f1c2b3da-93d9-4773-a1bb-dc7dc525526e'::uuid]::uuid[]),
  ('2e6b90a7-1601-4101-a03b-a0b06cfeed52'::uuid, ARRAY['5e05e51b-dd96-4e6f-95b1-e6fb73ab3683'::uuid,'f1c2b3da-93d9-4773-a1bb-dc7dc525526e'::uuid,'5e255ed6-58ba-4abe-9816-2dcfe5d297a1'::uuid]::uuid[]),
  ('5e05e51b-dd96-4e6f-95b1-e6fb73ab3683'::uuid, ARRAY['f1c2b3da-93d9-4773-a1bb-dc7dc525526e'::uuid,'5e255ed6-58ba-4abe-9816-2dcfe5d297a1'::uuid,'cb5b75fa-4c8f-4f7f-a037-9f66f220f11b'::uuid]::uuid[]),
  ('cd4f4e09-74bc-4e74-92bb-715e906c6f45'::uuid, ARRAY['d23becbe-65ac-4d53-ade0-7a0be85b4e54'::uuid,'0624474d-5f10-444f-b2bb-7120c34b300e'::uuid,'a9a8bca5-dd0c-4d0c-980f-ab14542b81b0'::uuid]::uuid[]),
  ('d23becbe-65ac-4d53-ade0-7a0be85b4e54'::uuid, ARRAY['0624474d-5f10-444f-b2bb-7120c34b300e'::uuid,'a9a8bca5-dd0c-4d0c-980f-ab14542b81b0'::uuid,'cd4f4e09-74bc-4e74-92bb-715e906c6f45'::uuid]::uuid[]),
  ('0624474d-5f10-444f-b2bb-7120c34b300e'::uuid, ARRAY['a9a8bca5-dd0c-4d0c-980f-ab14542b81b0'::uuid,'cd4f4e09-74bc-4e74-92bb-715e906c6f45'::uuid,'d23becbe-65ac-4d53-ade0-7a0be85b4e54'::uuid]::uuid[]),
  ('af274ead-9bc7-4d01-b82e-9df2a1d92922'::uuid, ARRAY['34d2b908-85cf-4c72-afed-114e681fc92c'::uuid,'e6446ea0-6720-4b1b-93b4-0073cda869b0'::uuid,'3b5212e9-1512-42db-b23e-779eaba2b9ff'::uuid]::uuid[]),
  ('34d2b908-85cf-4c72-afed-114e681fc92c'::uuid, ARRAY['e6446ea0-6720-4b1b-93b4-0073cda869b0'::uuid,'3b5212e9-1512-42db-b23e-779eaba2b9ff'::uuid,'675d4f89-9d6f-4c0c-8369-6bf2fac4416a'::uuid]::uuid[]),
  ('e6446ea0-6720-4b1b-93b4-0073cda869b0'::uuid, ARRAY['3b5212e9-1512-42db-b23e-779eaba2b9ff'::uuid,'675d4f89-9d6f-4c0c-8369-6bf2fac4416a'::uuid,'d4fbf009-c6e3-4207-83be-19fd72c7867a'::uuid]::uuid[]),
  ('f1c2b3da-93d9-4773-a1bb-dc7dc525526e'::uuid, ARRAY['5e255ed6-58ba-4abe-9816-2dcfe5d297a1'::uuid,'cb5b75fa-4c8f-4f7f-a037-9f66f220f11b'::uuid,'cac9a7e7-58a6-443d-83f6-17ad197fd2fa'::uuid]::uuid[]),
  ('3b5212e9-1512-42db-b23e-779eaba2b9ff'::uuid, ARRAY['675d4f89-9d6f-4c0c-8369-6bf2fac4416a'::uuid,'d4fbf009-c6e3-4207-83be-19fd72c7867a'::uuid,'059cedc5-6ea0-4b54-999b-54c7f9a72c13'::uuid]::uuid[]),
  ('cf8e4771-f084-4827-88fd-7c73790ba39d'::uuid, ARRAY['0eaa335f-398e-4086-9f91-f051b0b5fdaf'::uuid,'2d721344-9a00-47ce-a593-8d2f3494ca04'::uuid,'342df559-c1a3-454b-97f7-d291c8abfef4'::uuid]::uuid[]),
  ('0eaa335f-398e-4086-9f91-f051b0b5fdaf'::uuid, ARRAY['2d721344-9a00-47ce-a593-8d2f3494ca04'::uuid,'342df559-c1a3-454b-97f7-d291c8abfef4'::uuid,'d128251c-a98d-45dd-b955-a527dcb95686'::uuid]::uuid[]),
  ('2d721344-9a00-47ce-a593-8d2f3494ca04'::uuid, ARRAY['342df559-c1a3-454b-97f7-d291c8abfef4'::uuid,'d128251c-a98d-45dd-b955-a527dcb95686'::uuid,'29419fd5-770e-4173-bf33-6ed83948def3'::uuid]::uuid[]),
  ('342df559-c1a3-454b-97f7-d291c8abfef4'::uuid, ARRAY['d128251c-a98d-45dd-b955-a527dcb95686'::uuid,'29419fd5-770e-4173-bf33-6ed83948def3'::uuid,'cf8e4771-f084-4827-88fd-7c73790ba39d'::uuid]::uuid[]),
  ('d77151a6-61a7-46ac-913e-bb8be9007644'::uuid, ARRAY['fa71e1c8-fb43-4162-954d-966066b6ab29'::uuid,'0f74c5d3-e37a-4108-8dc9-dfeb5efa18f3'::uuid,'10d6b9b9-1b29-4d2e-9acd-0f3bd03542f1'::uuid]::uuid[]),
  ('fa71e1c8-fb43-4162-954d-966066b6ab29'::uuid, ARRAY['0f74c5d3-e37a-4108-8dc9-dfeb5efa18f3'::uuid,'10d6b9b9-1b29-4d2e-9acd-0f3bd03542f1'::uuid,'f3fe27a2-aa95-4df8-84db-04421ae9ecec'::uuid]::uuid[]),
  ('0f74c5d3-e37a-4108-8dc9-dfeb5efa18f3'::uuid, ARRAY['10d6b9b9-1b29-4d2e-9acd-0f3bd03542f1'::uuid,'f3fe27a2-aa95-4df8-84db-04421ae9ecec'::uuid,'e9bb9674-dde7-4034-a792-008a3774717c'::uuid]::uuid[]),
  ('10d6b9b9-1b29-4d2e-9acd-0f3bd03542f1'::uuid, ARRAY['f3fe27a2-aa95-4df8-84db-04421ae9ecec'::uuid,'e9bb9674-dde7-4034-a792-008a3774717c'::uuid,'e0f72227-39ed-46c8-a233-21d976a5ad87'::uuid]::uuid[]),
  ('675d4f89-9d6f-4c0c-8369-6bf2fac4416a'::uuid, ARRAY['d4fbf009-c6e3-4207-83be-19fd72c7867a'::uuid,'059cedc5-6ea0-4b54-999b-54c7f9a72c13'::uuid,'87574615-92f7-43c8-b82f-c8674b31ef43'::uuid]::uuid[]),
  ('92403e49-ee15-48af-b370-786abbebd34d'::uuid, ARRAY['c68d1994-1b10-4769-a489-ae7eafd3e131'::uuid,'ae1bb4b7-4426-41ec-b116-2f97983794a5'::uuid,'1903d4ba-f493-4fe3-9f5d-3fc9bd8cce85'::uuid]::uuid[]),
  ('c68d1994-1b10-4769-a489-ae7eafd3e131'::uuid, ARRAY['ae1bb4b7-4426-41ec-b116-2f97983794a5'::uuid,'1903d4ba-f493-4fe3-9f5d-3fc9bd8cce85'::uuid,'069f83e3-6f89-4f65-9454-92b91987cac9'::uuid]::uuid[]),
  ('ae1bb4b7-4426-41ec-b116-2f97983794a5'::uuid, ARRAY['1903d4ba-f493-4fe3-9f5d-3fc9bd8cce85'::uuid,'069f83e3-6f89-4f65-9454-92b91987cac9'::uuid,'d8e12534-7497-4138-9735-d32d372bc913'::uuid]::uuid[]),
  ('5e255ed6-58ba-4abe-9816-2dcfe5d297a1'::uuid, ARRAY['cb5b75fa-4c8f-4f7f-a037-9f66f220f11b'::uuid,'cac9a7e7-58a6-443d-83f6-17ad197fd2fa'::uuid,'1fd88854-4c87-4ad1-b7f7-ff9dad320e8b'::uuid]::uuid[]),
  ('cb5b75fa-4c8f-4f7f-a037-9f66f220f11b'::uuid, ARRAY['cac9a7e7-58a6-443d-83f6-17ad197fd2fa'::uuid,'1fd88854-4c87-4ad1-b7f7-ff9dad320e8b'::uuid,'d07cf775-40a0-4b15-ae59-fcf1e51ad6cb'::uuid]::uuid[]),
  ('d4fbf009-c6e3-4207-83be-19fd72c7867a'::uuid, ARRAY['059cedc5-6ea0-4b54-999b-54c7f9a72c13'::uuid,'87574615-92f7-43c8-b82f-c8674b31ef43'::uuid,'af274ead-9bc7-4d01-b82e-9df2a1d92922'::uuid]::uuid[]),
  ('059cedc5-6ea0-4b54-999b-54c7f9a72c13'::uuid, ARRAY['87574615-92f7-43c8-b82f-c8674b31ef43'::uuid,'af274ead-9bc7-4d01-b82e-9df2a1d92922'::uuid,'34d2b908-85cf-4c72-afed-114e681fc92c'::uuid]::uuid[]),
  ('1903d4ba-f493-4fe3-9f5d-3fc9bd8cce85'::uuid, ARRAY['069f83e3-6f89-4f65-9454-92b91987cac9'::uuid,'d8e12534-7497-4138-9735-d32d372bc913'::uuid,'92403e49-ee15-48af-b370-786abbebd34d'::uuid]::uuid[]),
  ('f3fe27a2-aa95-4df8-84db-04421ae9ecec'::uuid, ARRAY['e9bb9674-dde7-4034-a792-008a3774717c'::uuid,'e0f72227-39ed-46c8-a233-21d976a5ad87'::uuid,'d77151a6-61a7-46ac-913e-bb8be9007644'::uuid]::uuid[]),
  ('e9bb9674-dde7-4034-a792-008a3774717c'::uuid, ARRAY['e0f72227-39ed-46c8-a233-21d976a5ad87'::uuid,'d77151a6-61a7-46ac-913e-bb8be9007644'::uuid,'fa71e1c8-fb43-4162-954d-966066b6ab29'::uuid]::uuid[]),
  ('d128251c-a98d-45dd-b955-a527dcb95686'::uuid, ARRAY['29419fd5-770e-4173-bf33-6ed83948def3'::uuid,'cf8e4771-f084-4827-88fd-7c73790ba39d'::uuid,'0eaa335f-398e-4086-9f91-f051b0b5fdaf'::uuid]::uuid[]),
  ('cac9a7e7-58a6-443d-83f6-17ad197fd2fa'::uuid, ARRAY['1fd88854-4c87-4ad1-b7f7-ff9dad320e8b'::uuid,'d07cf775-40a0-4b15-ae59-fcf1e51ad6cb'::uuid,'12773583-f2e8-4273-b1a3-5e24924d4b5c'::uuid]::uuid[]),
  ('069f83e3-6f89-4f65-9454-92b91987cac9'::uuid, ARRAY['d8e12534-7497-4138-9735-d32d372bc913'::uuid,'92403e49-ee15-48af-b370-786abbebd34d'::uuid,'c68d1994-1b10-4769-a489-ae7eafd3e131'::uuid]::uuid[]),
  ('d8e12534-7497-4138-9735-d32d372bc913'::uuid, ARRAY['92403e49-ee15-48af-b370-786abbebd34d'::uuid,'c68d1994-1b10-4769-a489-ae7eafd3e131'::uuid,'ae1bb4b7-4426-41ec-b116-2f97983794a5'::uuid]::uuid[]),
  ('e0f72227-39ed-46c8-a233-21d976a5ad87'::uuid, ARRAY['d77151a6-61a7-46ac-913e-bb8be9007644'::uuid,'fa71e1c8-fb43-4162-954d-966066b6ab29'::uuid,'0f74c5d3-e37a-4108-8dc9-dfeb5efa18f3'::uuid]::uuid[]),
  ('a9a8bca5-dd0c-4d0c-980f-ab14542b81b0'::uuid, ARRAY['cd4f4e09-74bc-4e74-92bb-715e906c6f45'::uuid,'d23becbe-65ac-4d53-ade0-7a0be85b4e54'::uuid,'0624474d-5f10-444f-b2bb-7120c34b300e'::uuid]::uuid[]),
  ('1fd88854-4c87-4ad1-b7f7-ff9dad320e8b'::uuid, ARRAY['d07cf775-40a0-4b15-ae59-fcf1e51ad6cb'::uuid,'12773583-f2e8-4273-b1a3-5e24924d4b5c'::uuid,'2e6b90a7-1601-4101-a03b-a0b06cfeed52'::uuid]::uuid[]),
  ('29419fd5-770e-4173-bf33-6ed83948def3'::uuid, ARRAY['cf8e4771-f084-4827-88fd-7c73790ba39d'::uuid,'0eaa335f-398e-4086-9f91-f051b0b5fdaf'::uuid,'2d721344-9a00-47ce-a593-8d2f3494ca04'::uuid]::uuid[]),
  ('d07cf775-40a0-4b15-ae59-fcf1e51ad6cb'::uuid, ARRAY['12773583-f2e8-4273-b1a3-5e24924d4b5c'::uuid,'2e6b90a7-1601-4101-a03b-a0b06cfeed52'::uuid,'5e05e51b-dd96-4e6f-95b1-e6fb73ab3683'::uuid]::uuid[]),
  ('87574615-92f7-43c8-b82f-c8674b31ef43'::uuid, ARRAY['af274ead-9bc7-4d01-b82e-9df2a1d92922'::uuid,'34d2b908-85cf-4c72-afed-114e681fc92c'::uuid,'e6446ea0-6720-4b1b-93b4-0073cda869b0'::uuid]::uuid[]),
  ('3f5a9186-be3c-4796-9ce1-3303473de28a'::uuid, ARRAY['a8a95c85-c17b-47fa-9865-39dc6295c34f'::uuid,'3fbf75a2-4d9e-4a51-a4f9-ad0bca49c928'::uuid,'2c077e5a-76db-4ee0-b19f-700c2bc1d75f'::uuid]::uuid[]),
  ('a8a95c85-c17b-47fa-9865-39dc6295c34f'::uuid, ARRAY['3fbf75a2-4d9e-4a51-a4f9-ad0bca49c928'::uuid,'2c077e5a-76db-4ee0-b19f-700c2bc1d75f'::uuid,'a9b1c5b4-1ad8-4149-a64e-335a3971f0ce'::uuid]::uuid[]),
  ('3fbf75a2-4d9e-4a51-a4f9-ad0bca49c928'::uuid, ARRAY['2c077e5a-76db-4ee0-b19f-700c2bc1d75f'::uuid,'a9b1c5b4-1ad8-4149-a64e-335a3971f0ce'::uuid,'016f07db-29b0-4229-ad9a-f5c2a7cb5435'::uuid]::uuid[]),
  ('2c077e5a-76db-4ee0-b19f-700c2bc1d75f'::uuid, ARRAY['a9b1c5b4-1ad8-4149-a64e-335a3971f0ce'::uuid,'016f07db-29b0-4229-ad9a-f5c2a7cb5435'::uuid,'7c4e9e18-0a1a-49db-a10f-ec95a3367819'::uuid]::uuid[]),
  ('a9b1c5b4-1ad8-4149-a64e-335a3971f0ce'::uuid, ARRAY['016f07db-29b0-4229-ad9a-f5c2a7cb5435'::uuid,'7c4e9e18-0a1a-49db-a10f-ec95a3367819'::uuid,'8642e1d5-5e0f-4507-ac62-15cd2c8145de'::uuid]::uuid[]),
  ('016f07db-29b0-4229-ad9a-f5c2a7cb5435'::uuid, ARRAY['7c4e9e18-0a1a-49db-a10f-ec95a3367819'::uuid,'8642e1d5-5e0f-4507-ac62-15cd2c8145de'::uuid,'3f5a9186-be3c-4796-9ce1-3303473de28a'::uuid]::uuid[]),
  ('9680cd0c-e634-4376-80b5-f4651df6ebc6'::uuid, ARRAY['9193a6f4-d719-4bed-880c-94e39cff3f19'::uuid,'3f1c7dd0-66eb-4b6e-8a4d-bdfe52eb5d0d'::uuid,'7a1592a7-e105-4dd5-a03d-e71cd6c024d9'::uuid]::uuid[]),
  ('9193a6f4-d719-4bed-880c-94e39cff3f19'::uuid, ARRAY['3f1c7dd0-66eb-4b6e-8a4d-bdfe52eb5d0d'::uuid,'7a1592a7-e105-4dd5-a03d-e71cd6c024d9'::uuid,'01c0c4fa-f669-4f25-88ea-f18c58249e55'::uuid]::uuid[]),
  ('3f1c7dd0-66eb-4b6e-8a4d-bdfe52eb5d0d'::uuid, ARRAY['7a1592a7-e105-4dd5-a03d-e71cd6c024d9'::uuid,'01c0c4fa-f669-4f25-88ea-f18c58249e55'::uuid,'9680cd0c-e634-4376-80b5-f4651df6ebc6'::uuid]::uuid[]),
  ('7a1592a7-e105-4dd5-a03d-e71cd6c024d9'::uuid, ARRAY['01c0c4fa-f669-4f25-88ea-f18c58249e55'::uuid,'9680cd0c-e634-4376-80b5-f4651df6ebc6'::uuid,'9193a6f4-d719-4bed-880c-94e39cff3f19'::uuid]::uuid[]),
  ('6fac8512-2ba1-48ea-a7d7-8951904270ac'::uuid, ARRAY['8b6917bf-458c-40a5-92ff-f169a3f39040'::uuid,'8fdc3c63-4250-4b6f-b21a-9091f36178a6'::uuid,'59b39948-6a09-4a04-afa7-370244bd5eba'::uuid]::uuid[]),
  ('8b6917bf-458c-40a5-92ff-f169a3f39040'::uuid, ARRAY['8fdc3c63-4250-4b6f-b21a-9091f36178a6'::uuid,'59b39948-6a09-4a04-afa7-370244bd5eba'::uuid,'e9723eed-f59d-4d1d-8cea-0d02df14c815'::uuid]::uuid[]),
  ('8fdc3c63-4250-4b6f-b21a-9091f36178a6'::uuid, ARRAY['59b39948-6a09-4a04-afa7-370244bd5eba'::uuid,'e9723eed-f59d-4d1d-8cea-0d02df14c815'::uuid,'8f5447e5-7557-49cd-9e43-90086f434e56'::uuid]::uuid[]),
  ('59b39948-6a09-4a04-afa7-370244bd5eba'::uuid, ARRAY['e9723eed-f59d-4d1d-8cea-0d02df14c815'::uuid,'8f5447e5-7557-49cd-9e43-90086f434e56'::uuid,'39ecebed-4cb6-4d43-b450-abcf1c1cb4f3'::uuid]::uuid[]),
  ('e9723eed-f59d-4d1d-8cea-0d02df14c815'::uuid, ARRAY['8f5447e5-7557-49cd-9e43-90086f434e56'::uuid,'39ecebed-4cb6-4d43-b450-abcf1c1cb4f3'::uuid,'41570d41-9608-4715-bb9e-f91acbf1428f'::uuid]::uuid[]),
  ('8f5447e5-7557-49cd-9e43-90086f434e56'::uuid, ARRAY['39ecebed-4cb6-4d43-b450-abcf1c1cb4f3'::uuid,'41570d41-9608-4715-bb9e-f91acbf1428f'::uuid,'6fac8512-2ba1-48ea-a7d7-8951904270ac'::uuid]::uuid[]),
  ('39ecebed-4cb6-4d43-b450-abcf1c1cb4f3'::uuid, ARRAY['41570d41-9608-4715-bb9e-f91acbf1428f'::uuid,'6fac8512-2ba1-48ea-a7d7-8951904270ac'::uuid,'8b6917bf-458c-40a5-92ff-f169a3f39040'::uuid]::uuid[]),
  ('c611c9e2-d746-484d-89aa-27a4f142bc89'::uuid, ARRAY['44b2abc4-8f1b-4988-a34d-4bd278de59f9'::uuid,'d879d792-4e1a-444e-850f-94e4f0c74c1d'::uuid,'18bb6da8-1388-4c61-9295-e1b2d5682a17'::uuid]::uuid[]),
  ('44b2abc4-8f1b-4988-a34d-4bd278de59f9'::uuid, ARRAY['d879d792-4e1a-444e-850f-94e4f0c74c1d'::uuid,'18bb6da8-1388-4c61-9295-e1b2d5682a17'::uuid,'d353a54e-66ec-4475-8462-8e17bf6c2eba'::uuid]::uuid[]),
  ('d879d792-4e1a-444e-850f-94e4f0c74c1d'::uuid, ARRAY['18bb6da8-1388-4c61-9295-e1b2d5682a17'::uuid,'d353a54e-66ec-4475-8462-8e17bf6c2eba'::uuid,'ba96e96c-2af9-4875-8190-2898a526408b'::uuid]::uuid[]),
  ('18bb6da8-1388-4c61-9295-e1b2d5682a17'::uuid, ARRAY['d353a54e-66ec-4475-8462-8e17bf6c2eba'::uuid,'ba96e96c-2af9-4875-8190-2898a526408b'::uuid,'f6d44c73-ca2a-47db-ad99-45b4f78b40fb'::uuid]::uuid[]),
  ('d353a54e-66ec-4475-8462-8e17bf6c2eba'::uuid, ARRAY['ba96e96c-2af9-4875-8190-2898a526408b'::uuid,'f6d44c73-ca2a-47db-ad99-45b4f78b40fb'::uuid,'6be4dcc7-f509-4616-9d61-06f710b2bde7'::uuid]::uuid[]),
  ('ba96e96c-2af9-4875-8190-2898a526408b'::uuid, ARRAY['f6d44c73-ca2a-47db-ad99-45b4f78b40fb'::uuid,'6be4dcc7-f509-4616-9d61-06f710b2bde7'::uuid,'c611c9e2-d746-484d-89aa-27a4f142bc89'::uuid]::uuid[]),
  ('0b822aaf-35eb-438a-b4d5-8d30a6911543'::uuid, ARRAY['402a4371-b7bb-409b-bc5f-4dfe74999982'::uuid,'8e5a6681-fe1c-4bf3-ab13-bdecb61df674'::uuid,'d2425ba4-5c00-4226-bc45-60ae7c5dc94b'::uuid]::uuid[]),
  ('402a4371-b7bb-409b-bc5f-4dfe74999982'::uuid, ARRAY['8e5a6681-fe1c-4bf3-ab13-bdecb61df674'::uuid,'d2425ba4-5c00-4226-bc45-60ae7c5dc94b'::uuid,'97614368-9dcd-4039-89fa-36a2970eb715'::uuid]::uuid[]),
  ('8e5a6681-fe1c-4bf3-ab13-bdecb61df674'::uuid, ARRAY['d2425ba4-5c00-4226-bc45-60ae7c5dc94b'::uuid,'97614368-9dcd-4039-89fa-36a2970eb715'::uuid,'e6b634f5-67f4-4f9e-8c3c-2ca63623973f'::uuid]::uuid[]),
  ('d2425ba4-5c00-4226-bc45-60ae7c5dc94b'::uuid, ARRAY['97614368-9dcd-4039-89fa-36a2970eb715'::uuid,'e6b634f5-67f4-4f9e-8c3c-2ca63623973f'::uuid,'38918903-a704-492c-b138-d35c99ab978e'::uuid]::uuid[]),
  ('97614368-9dcd-4039-89fa-36a2970eb715'::uuid, ARRAY['e6b634f5-67f4-4f9e-8c3c-2ca63623973f'::uuid,'38918903-a704-492c-b138-d35c99ab978e'::uuid,'0b822aaf-35eb-438a-b4d5-8d30a6911543'::uuid]::uuid[]),
  ('e6b634f5-67f4-4f9e-8c3c-2ca63623973f'::uuid, ARRAY['38918903-a704-492c-b138-d35c99ab978e'::uuid,'0b822aaf-35eb-438a-b4d5-8d30a6911543'::uuid,'402a4371-b7bb-409b-bc5f-4dfe74999982'::uuid]::uuid[]),
  ('a303740d-029e-4b0c-9112-1e5ae9a1c68f'::uuid, ARRAY['f196c72e-7243-480c-a3dd-70c2237c0cb3'::uuid,'9e54a141-aef6-455e-9873-b2f096a77fea'::uuid,'0a083d5d-3364-48ac-99ba-8b0caa5f79cf'::uuid]::uuid[]),
  ('f196c72e-7243-480c-a3dd-70c2237c0cb3'::uuid, ARRAY['9e54a141-aef6-455e-9873-b2f096a77fea'::uuid,'0a083d5d-3364-48ac-99ba-8b0caa5f79cf'::uuid,'a303740d-029e-4b0c-9112-1e5ae9a1c68f'::uuid]::uuid[]),
  ('9e54a141-aef6-455e-9873-b2f096a77fea'::uuid, ARRAY['0a083d5d-3364-48ac-99ba-8b0caa5f79cf'::uuid,'a303740d-029e-4b0c-9112-1e5ae9a1c68f'::uuid,'f196c72e-7243-480c-a3dd-70c2237c0cb3'::uuid]::uuid[]),
  ('0a083d5d-3364-48ac-99ba-8b0caa5f79cf'::uuid, ARRAY['a303740d-029e-4b0c-9112-1e5ae9a1c68f'::uuid,'f196c72e-7243-480c-a3dd-70c2237c0cb3'::uuid,'9e54a141-aef6-455e-9873-b2f096a77fea'::uuid]::uuid[]),
  ('f6d44c73-ca2a-47db-ad99-45b4f78b40fb'::uuid, ARRAY['6be4dcc7-f509-4616-9d61-06f710b2bde7'::uuid,'c611c9e2-d746-484d-89aa-27a4f142bc89'::uuid,'44b2abc4-8f1b-4988-a34d-4bd278de59f9'::uuid]::uuid[]),
  ('6be4dcc7-f509-4616-9d61-06f710b2bde7'::uuid, ARRAY['c611c9e2-d746-484d-89aa-27a4f142bc89'::uuid,'44b2abc4-8f1b-4988-a34d-4bd278de59f9'::uuid,'d879d792-4e1a-444e-850f-94e4f0c74c1d'::uuid]::uuid[]),
  ('7c4e9e18-0a1a-49db-a10f-ec95a3367819'::uuid, ARRAY['8642e1d5-5e0f-4507-ac62-15cd2c8145de'::uuid,'3f5a9186-be3c-4796-9ce1-3303473de28a'::uuid,'a8a95c85-c17b-47fa-9865-39dc6295c34f'::uuid]::uuid[]),
  ('01c0c4fa-f669-4f25-88ea-f18c58249e55'::uuid, ARRAY['9680cd0c-e634-4376-80b5-f4651df6ebc6'::uuid,'9193a6f4-d719-4bed-880c-94e39cff3f19'::uuid,'3f1c7dd0-66eb-4b6e-8a4d-bdfe52eb5d0d'::uuid]::uuid[]),
  ('38918903-a704-492c-b138-d35c99ab978e'::uuid, ARRAY['0b822aaf-35eb-438a-b4d5-8d30a6911543'::uuid,'402a4371-b7bb-409b-bc5f-4dfe74999982'::uuid,'8e5a6681-fe1c-4bf3-ab13-bdecb61df674'::uuid]::uuid[]),
  ('41570d41-9608-4715-bb9e-f91acbf1428f'::uuid, ARRAY['6fac8512-2ba1-48ea-a7d7-8951904270ac'::uuid,'8b6917bf-458c-40a5-92ff-f169a3f39040'::uuid,'8fdc3c63-4250-4b6f-b21a-9091f36178a6'::uuid]::uuid[]),
  ('8642e1d5-5e0f-4507-ac62-15cd2c8145de'::uuid, ARRAY['3f5a9186-be3c-4796-9ce1-3303473de28a'::uuid,'a8a95c85-c17b-47fa-9865-39dc6295c34f'::uuid,'3fbf75a2-4d9e-4a51-a4f9-ad0bca49c928'::uuid]::uuid[]),
  ('13e07a82-9b94-4564-98f1-3ca542100255'::uuid, ARRAY['d6933e9c-7ec5-45a4-b623-8bf92f683ead'::uuid,'fb6f320e-d30c-4f40-b2ac-70c7255f6386'::uuid,'2622b7b1-8886-45a4-a832-7dc92fe12152'::uuid]::uuid[]),
  ('d6933e9c-7ec5-45a4-b623-8bf92f683ead'::uuid, ARRAY['fb6f320e-d30c-4f40-b2ac-70c7255f6386'::uuid,'2622b7b1-8886-45a4-a832-7dc92fe12152'::uuid,'d44f29ed-dbc5-482d-88c2-114607aab100'::uuid]::uuid[]),
  ('fb6f320e-d30c-4f40-b2ac-70c7255f6386'::uuid, ARRAY['2622b7b1-8886-45a4-a832-7dc92fe12152'::uuid,'d44f29ed-dbc5-482d-88c2-114607aab100'::uuid,'ac8f96b3-45f1-4b58-9f16-58f6f9c65c7a'::uuid]::uuid[]),
  ('63e065fe-4f7e-4d12-9e72-ae021a8a3d52'::uuid, ARRAY['1ef9e1d2-64e8-4e05-99a7-a9799fe47dc8'::uuid,'1c1aea2c-208a-4241-b36c-88fb752f61c5'::uuid,'3fd95c04-474a-4d38-bec7-b7e6773a5856'::uuid]::uuid[]),
  ('1ef9e1d2-64e8-4e05-99a7-a9799fe47dc8'::uuid, ARRAY['1c1aea2c-208a-4241-b36c-88fb752f61c5'::uuid,'3fd95c04-474a-4d38-bec7-b7e6773a5856'::uuid,'ed109e24-0efc-482e-a50d-79f6f4730902'::uuid]::uuid[]),
  ('1c1aea2c-208a-4241-b36c-88fb752f61c5'::uuid, ARRAY['3fd95c04-474a-4d38-bec7-b7e6773a5856'::uuid,'ed109e24-0efc-482e-a50d-79f6f4730902'::uuid,'eaee311b-2dd4-45dd-bc04-becf5a09e94f'::uuid]::uuid[]),
  ('3fd95c04-474a-4d38-bec7-b7e6773a5856'::uuid, ARRAY['ed109e24-0efc-482e-a50d-79f6f4730902'::uuid,'eaee311b-2dd4-45dd-bc04-becf5a09e94f'::uuid,'1a1d6a51-0d79-4a7f-b1bc-3faf78205ffe'::uuid]::uuid[]),
  ('ed109e24-0efc-482e-a50d-79f6f4730902'::uuid, ARRAY['eaee311b-2dd4-45dd-bc04-becf5a09e94f'::uuid,'1a1d6a51-0d79-4a7f-b1bc-3faf78205ffe'::uuid,'e97649a5-ec29-4218-b045-90f0cd981e9f'::uuid]::uuid[]),
  ('eaee311b-2dd4-45dd-bc04-becf5a09e94f'::uuid, ARRAY['1a1d6a51-0d79-4a7f-b1bc-3faf78205ffe'::uuid,'e97649a5-ec29-4218-b045-90f0cd981e9f'::uuid,'dac8bb0f-679a-49c7-b3f6-500c8608389b'::uuid]::uuid[]),
  ('1a1d6a51-0d79-4a7f-b1bc-3faf78205ffe'::uuid, ARRAY['e97649a5-ec29-4218-b045-90f0cd981e9f'::uuid,'dac8bb0f-679a-49c7-b3f6-500c8608389b'::uuid,'d647a866-296f-480f-af90-04b783ed82d5'::uuid]::uuid[]),
  ('e97649a5-ec29-4218-b045-90f0cd981e9f'::uuid, ARRAY['dac8bb0f-679a-49c7-b3f6-500c8608389b'::uuid,'d647a866-296f-480f-af90-04b783ed82d5'::uuid,'bb9663a5-4302-4ef7-8e00-9a4267bb8080'::uuid]::uuid[]),
  ('dac8bb0f-679a-49c7-b3f6-500c8608389b'::uuid, ARRAY['d647a866-296f-480f-af90-04b783ed82d5'::uuid,'bb9663a5-4302-4ef7-8e00-9a4267bb8080'::uuid,'63e065fe-4f7e-4d12-9e72-ae021a8a3d52'::uuid]::uuid[]),
  ('d647a866-296f-480f-af90-04b783ed82d5'::uuid, ARRAY['bb9663a5-4302-4ef7-8e00-9a4267bb8080'::uuid,'63e065fe-4f7e-4d12-9e72-ae021a8a3d52'::uuid,'1ef9e1d2-64e8-4e05-99a7-a9799fe47dc8'::uuid]::uuid[]),
  ('43cbd342-837f-47c5-911f-b44997ebf878'::uuid, ARRAY['fb6df01d-98b6-448a-9373-60574bba417d'::uuid,'59fb0725-da26-41f7-a6f2-740430c3b4ad'::uuid,'23483bdb-6f98-4599-9dbd-961b14320873'::uuid]::uuid[]),
  ('fb6df01d-98b6-448a-9373-60574bba417d'::uuid, ARRAY['59fb0725-da26-41f7-a6f2-740430c3b4ad'::uuid,'23483bdb-6f98-4599-9dbd-961b14320873'::uuid,'439438e5-508e-4fb2-88d5-83e306664bff'::uuid]::uuid[]),
  ('59fb0725-da26-41f7-a6f2-740430c3b4ad'::uuid, ARRAY['23483bdb-6f98-4599-9dbd-961b14320873'::uuid,'439438e5-508e-4fb2-88d5-83e306664bff'::uuid,'e2c54ad1-3272-4f1e-b93e-ff04e011422c'::uuid]::uuid[]),
  ('23483bdb-6f98-4599-9dbd-961b14320873'::uuid, ARRAY['439438e5-508e-4fb2-88d5-83e306664bff'::uuid,'e2c54ad1-3272-4f1e-b93e-ff04e011422c'::uuid,'6e471052-b223-4295-b23c-83b49a1ecc4b'::uuid]::uuid[]),
  ('439438e5-508e-4fb2-88d5-83e306664bff'::uuid, ARRAY['e2c54ad1-3272-4f1e-b93e-ff04e011422c'::uuid,'6e471052-b223-4295-b23c-83b49a1ecc4b'::uuid,'16d69c03-8231-4387-b1f6-5237c0b6c41b'::uuid]::uuid[]),
  ('e2c54ad1-3272-4f1e-b93e-ff04e011422c'::uuid, ARRAY['6e471052-b223-4295-b23c-83b49a1ecc4b'::uuid,'16d69c03-8231-4387-b1f6-5237c0b6c41b'::uuid,'43cbd342-837f-47c5-911f-b44997ebf878'::uuid]::uuid[]),
  ('6e471052-b223-4295-b23c-83b49a1ecc4b'::uuid, ARRAY['16d69c03-8231-4387-b1f6-5237c0b6c41b'::uuid,'43cbd342-837f-47c5-911f-b44997ebf878'::uuid,'fb6df01d-98b6-448a-9373-60574bba417d'::uuid]::uuid[]),
  ('b0a4cc33-89ab-4095-9606-d9ed1dbf5b64'::uuid, ARRAY['ea0c68b2-98d6-4798-9ea8-e757233341d0'::uuid,'77747280-8932-4b59-aae8-9d0736449644'::uuid,'7ee0e030-5ad3-4a55-be2e-eb47dc353885'::uuid]::uuid[]),
  ('ea0c68b2-98d6-4798-9ea8-e757233341d0'::uuid, ARRAY['77747280-8932-4b59-aae8-9d0736449644'::uuid,'7ee0e030-5ad3-4a55-be2e-eb47dc353885'::uuid,'b0a4cc33-89ab-4095-9606-d9ed1dbf5b64'::uuid]::uuid[]),
  ('77747280-8932-4b59-aae8-9d0736449644'::uuid, ARRAY['7ee0e030-5ad3-4a55-be2e-eb47dc353885'::uuid,'b0a4cc33-89ab-4095-9606-d9ed1dbf5b64'::uuid,'ea0c68b2-98d6-4798-9ea8-e757233341d0'::uuid]::uuid[]),
  ('b0460657-29b1-4df9-ac03-63eb4681b894'::uuid, ARRAY['5632760c-2adb-4da3-95b6-c6e2cae73c1e'::uuid,'648780c7-6529-42d5-a61c-3874c3b3f350'::uuid,'c80df412-92eb-48b7-8436-db54e78d3b66'::uuid]::uuid[]),
  ('5632760c-2adb-4da3-95b6-c6e2cae73c1e'::uuid, ARRAY['648780c7-6529-42d5-a61c-3874c3b3f350'::uuid,'c80df412-92eb-48b7-8436-db54e78d3b66'::uuid,'1f125871-d435-458e-b641-7df590d479f9'::uuid]::uuid[]),
  ('648780c7-6529-42d5-a61c-3874c3b3f350'::uuid, ARRAY['c80df412-92eb-48b7-8436-db54e78d3b66'::uuid,'1f125871-d435-458e-b641-7df590d479f9'::uuid,'27f8baf7-30f4-47d1-98b4-ce7b5ab2889f'::uuid]::uuid[]),
  ('c80df412-92eb-48b7-8436-db54e78d3b66'::uuid, ARRAY['1f125871-d435-458e-b641-7df590d479f9'::uuid,'27f8baf7-30f4-47d1-98b4-ce7b5ab2889f'::uuid,'282b24a7-af12-48c0-aba4-e24e6b4ee464'::uuid]::uuid[]),
  ('e3bfff7f-0295-4f9e-90bb-77de5fa8d2fc'::uuid, ARRAY['3fd5fecb-550c-4829-99c7-cb4bb6c5732b'::uuid,'d7ce346e-48aa-43a9-88c3-803ad0767d40'::uuid,'2eefff65-be10-4ebe-9269-cd2e0833df14'::uuid]::uuid[]),
  ('3fd5fecb-550c-4829-99c7-cb4bb6c5732b'::uuid, ARRAY['d7ce346e-48aa-43a9-88c3-803ad0767d40'::uuid,'2eefff65-be10-4ebe-9269-cd2e0833df14'::uuid,'e3bfff7f-0295-4f9e-90bb-77de5fa8d2fc'::uuid]::uuid[]),
  ('d7ce346e-48aa-43a9-88c3-803ad0767d40'::uuid, ARRAY['2eefff65-be10-4ebe-9269-cd2e0833df14'::uuid,'e3bfff7f-0295-4f9e-90bb-77de5fa8d2fc'::uuid,'3fd5fecb-550c-4829-99c7-cb4bb6c5732b'::uuid]::uuid[]),
  ('2eefff65-be10-4ebe-9269-cd2e0833df14'::uuid, ARRAY['e3bfff7f-0295-4f9e-90bb-77de5fa8d2fc'::uuid,'3fd5fecb-550c-4829-99c7-cb4bb6c5732b'::uuid,'d7ce346e-48aa-43a9-88c3-803ad0767d40'::uuid]::uuid[]),
  ('bb9663a5-4302-4ef7-8e00-9a4267bb8080'::uuid, ARRAY['63e065fe-4f7e-4d12-9e72-ae021a8a3d52'::uuid,'1ef9e1d2-64e8-4e05-99a7-a9799fe47dc8'::uuid,'1c1aea2c-208a-4241-b36c-88fb752f61c5'::uuid]::uuid[]),
  ('2622b7b1-8886-45a4-a832-7dc92fe12152'::uuid, ARRAY['d44f29ed-dbc5-482d-88c2-114607aab100'::uuid,'ac8f96b3-45f1-4b58-9f16-58f6f9c65c7a'::uuid,'13e07a82-9b94-4564-98f1-3ca542100255'::uuid]::uuid[]),
  ('16d69c03-8231-4387-b1f6-5237c0b6c41b'::uuid, ARRAY['43cbd342-837f-47c5-911f-b44997ebf878'::uuid,'fb6df01d-98b6-448a-9373-60574bba417d'::uuid,'59fb0725-da26-41f7-a6f2-740430c3b4ad'::uuid]::uuid[]),
  ('7ee0e030-5ad3-4a55-be2e-eb47dc353885'::uuid, ARRAY['b0a4cc33-89ab-4095-9606-d9ed1dbf5b64'::uuid,'ea0c68b2-98d6-4798-9ea8-e757233341d0'::uuid,'77747280-8932-4b59-aae8-9d0736449644'::uuid]::uuid[]),
  ('1f125871-d435-458e-b641-7df590d479f9'::uuid, ARRAY['27f8baf7-30f4-47d1-98b4-ce7b5ab2889f'::uuid,'282b24a7-af12-48c0-aba4-e24e6b4ee464'::uuid,'b0460657-29b1-4df9-ac03-63eb4681b894'::uuid]::uuid[]),
  ('d44f29ed-dbc5-482d-88c2-114607aab100'::uuid, ARRAY['ac8f96b3-45f1-4b58-9f16-58f6f9c65c7a'::uuid,'13e07a82-9b94-4564-98f1-3ca542100255'::uuid,'d6933e9c-7ec5-45a4-b623-8bf92f683ead'::uuid]::uuid[]),
  ('27f8baf7-30f4-47d1-98b4-ce7b5ab2889f'::uuid, ARRAY['282b24a7-af12-48c0-aba4-e24e6b4ee464'::uuid,'b0460657-29b1-4df9-ac03-63eb4681b894'::uuid,'5632760c-2adb-4da3-95b6-c6e2cae73c1e'::uuid]::uuid[]),
  ('282b24a7-af12-48c0-aba4-e24e6b4ee464'::uuid, ARRAY['b0460657-29b1-4df9-ac03-63eb4681b894'::uuid,'5632760c-2adb-4da3-95b6-c6e2cae73c1e'::uuid,'648780c7-6529-42d5-a61c-3874c3b3f350'::uuid]::uuid[]),
  ('ac8f96b3-45f1-4b58-9f16-58f6f9c65c7a'::uuid, ARRAY['13e07a82-9b94-4564-98f1-3ca542100255'::uuid,'d6933e9c-7ec5-45a4-b623-8bf92f683ead'::uuid,'fb6f320e-d30c-4f40-b2ac-70c7255f6386'::uuid]::uuid[]),
  ('53f5ad1f-88eb-464a-8860-388ea30d675b'::uuid, ARRAY['bd0ba88d-cfd7-47d5-abbf-536cd565ed8b'::uuid,'fef7902c-0338-445c-9bd8-d1f13386a317'::uuid,'2849582e-19fe-479e-b415-8051cbf0348b'::uuid]::uuid[]),
  ('bd0ba88d-cfd7-47d5-abbf-536cd565ed8b'::uuid, ARRAY['fef7902c-0338-445c-9bd8-d1f13386a317'::uuid,'2849582e-19fe-479e-b415-8051cbf0348b'::uuid,'53f5ad1f-88eb-464a-8860-388ea30d675b'::uuid]::uuid[]),
  ('ba9ca115-d7d0-457f-b175-027f3ab3a92c'::uuid, ARRAY['9778f4c4-b446-469a-b17a-a4127e399c86'::uuid,'6de0eb99-eec1-43b8-a8bf-15f488473950'::uuid,'d8830bd9-53dd-42d3-ba48-5d6c35e2bc42'::uuid]::uuid[]),
  ('9778f4c4-b446-469a-b17a-a4127e399c86'::uuid, ARRAY['6de0eb99-eec1-43b8-a8bf-15f488473950'::uuid,'d8830bd9-53dd-42d3-ba48-5d6c35e2bc42'::uuid,'41f8a25a-bcbc-4858-b7cc-8aaa48ad6f8d'::uuid]::uuid[]),
  ('b5320ab7-b677-4d77-b3f0-fcbf434867b5'::uuid, ARRAY['4c68acbf-aa90-4b41-81cc-aa78325a84e8'::uuid,'81678891-59cb-4722-af08-b26da56537e2'::uuid,'6149cd3e-e8cd-43bf-99e2-21bd0f07873f'::uuid]::uuid[]),
  ('6de0eb99-eec1-43b8-a8bf-15f488473950'::uuid, ARRAY['d8830bd9-53dd-42d3-ba48-5d6c35e2bc42'::uuid,'41f8a25a-bcbc-4858-b7cc-8aaa48ad6f8d'::uuid,'1da54819-3f8b-4ec4-b72f-dda8e87ababf'::uuid]::uuid[]),
  ('d8830bd9-53dd-42d3-ba48-5d6c35e2bc42'::uuid, ARRAY['41f8a25a-bcbc-4858-b7cc-8aaa48ad6f8d'::uuid,'1da54819-3f8b-4ec4-b72f-dda8e87ababf'::uuid,'f7d124c8-475d-493c-a96a-3c8929d7f836'::uuid]::uuid[]),
  ('41f8a25a-bcbc-4858-b7cc-8aaa48ad6f8d'::uuid, ARRAY['1da54819-3f8b-4ec4-b72f-dda8e87ababf'::uuid,'f7d124c8-475d-493c-a96a-3c8929d7f836'::uuid,'4f7f1f4e-ac77-4ce6-9e69-84c2bf86e9f9'::uuid]::uuid[]),
  ('11d0fc03-567c-41cb-a5cb-0825c2a602e7'::uuid, ARRAY['92dac062-8633-4930-a85f-2a5457fe88fd'::uuid,'b549b8ea-dc6c-40ed-ab1d-127c01ee52f5'::uuid,'53509e32-751d-41bf-83dc-42745404f277'::uuid]::uuid[]),
  ('92dac062-8633-4930-a85f-2a5457fe88fd'::uuid, ARRAY['b549b8ea-dc6c-40ed-ab1d-127c01ee52f5'::uuid,'53509e32-751d-41bf-83dc-42745404f277'::uuid,'675823dd-01df-449c-9f9d-b830f654eb7e'::uuid]::uuid[]),
  ('b549b8ea-dc6c-40ed-ab1d-127c01ee52f5'::uuid, ARRAY['53509e32-751d-41bf-83dc-42745404f277'::uuid,'675823dd-01df-449c-9f9d-b830f654eb7e'::uuid,'05702635-70b7-4db9-bf7f-50827610e9f3'::uuid]::uuid[]),
  ('53509e32-751d-41bf-83dc-42745404f277'::uuid, ARRAY['675823dd-01df-449c-9f9d-b830f654eb7e'::uuid,'05702635-70b7-4db9-bf7f-50827610e9f3'::uuid,'537562ab-c6d8-47d4-b15f-3addc7923639'::uuid]::uuid[]),
  ('675823dd-01df-449c-9f9d-b830f654eb7e'::uuid, ARRAY['05702635-70b7-4db9-bf7f-50827610e9f3'::uuid,'537562ab-c6d8-47d4-b15f-3addc7923639'::uuid,'46a8851d-4a8d-4015-b3ea-6bd2a7b13afd'::uuid]::uuid[]),
  ('05702635-70b7-4db9-bf7f-50827610e9f3'::uuid, ARRAY['537562ab-c6d8-47d4-b15f-3addc7923639'::uuid,'46a8851d-4a8d-4015-b3ea-6bd2a7b13afd'::uuid,'e3b7a805-209f-466d-be5a-d479e21078d8'::uuid]::uuid[]),
  ('537562ab-c6d8-47d4-b15f-3addc7923639'::uuid, ARRAY['46a8851d-4a8d-4015-b3ea-6bd2a7b13afd'::uuid,'e3b7a805-209f-466d-be5a-d479e21078d8'::uuid,'5fd2fe24-2feb-4732-a22f-17a70555b99b'::uuid]::uuid[]),
  ('7184f209-af82-441c-8b36-d4d4b4cbd202'::uuid, ARRAY['8f4529b7-5497-4605-b2f7-46059a008b47'::uuid,'c39c04a1-925f-4726-b9cc-26ef2a59d7d3'::uuid,'e0c12b8c-4f44-4e23-8e9a-64f0871c23ef'::uuid]::uuid[]),
  ('8f4529b7-5497-4605-b2f7-46059a008b47'::uuid, ARRAY['c39c04a1-925f-4726-b9cc-26ef2a59d7d3'::uuid,'e0c12b8c-4f44-4e23-8e9a-64f0871c23ef'::uuid,'3b9b1541-03f7-4096-9158-283dc94f9ddf'::uuid]::uuid[]),
  ('c39c04a1-925f-4726-b9cc-26ef2a59d7d3'::uuid, ARRAY['e0c12b8c-4f44-4e23-8e9a-64f0871c23ef'::uuid,'3b9b1541-03f7-4096-9158-283dc94f9ddf'::uuid,'21131e22-f270-40f2-bb17-eefe541ea042'::uuid]::uuid[]),
  ('e0c12b8c-4f44-4e23-8e9a-64f0871c23ef'::uuid, ARRAY['3b9b1541-03f7-4096-9158-283dc94f9ddf'::uuid,'21131e22-f270-40f2-bb17-eefe541ea042'::uuid,'7184f209-af82-441c-8b36-d4d4b4cbd202'::uuid]::uuid[]),
  ('3db2ed23-2670-48c4-9f05-a552eb45d0f4'::uuid, ARRAY['3e941ffd-c36a-4b9d-a55f-4181ab1b2f93'::uuid,'07a709ac-eef9-4046-ac4f-c4b63171ef39'::uuid,'15b2ba23-a18d-4173-8cf9-6d9fb40425cf'::uuid]::uuid[]),
  ('3e941ffd-c36a-4b9d-a55f-4181ab1b2f93'::uuid, ARRAY['07a709ac-eef9-4046-ac4f-c4b63171ef39'::uuid,'15b2ba23-a18d-4173-8cf9-6d9fb40425cf'::uuid,'37b9aeb3-1cc7-4983-b0da-058be49d7414'::uuid]::uuid[]),
  ('07a709ac-eef9-4046-ac4f-c4b63171ef39'::uuid, ARRAY['15b2ba23-a18d-4173-8cf9-6d9fb40425cf'::uuid,'37b9aeb3-1cc7-4983-b0da-058be49d7414'::uuid,'397c24fc-8eaf-4aee-a1c1-bb96a79ea1d9'::uuid]::uuid[]),
  ('15b2ba23-a18d-4173-8cf9-6d9fb40425cf'::uuid, ARRAY['37b9aeb3-1cc7-4983-b0da-058be49d7414'::uuid,'397c24fc-8eaf-4aee-a1c1-bb96a79ea1d9'::uuid,'3db2ed23-2670-48c4-9f05-a552eb45d0f4'::uuid]::uuid[]),
  ('4c68acbf-aa90-4b41-81cc-aa78325a84e8'::uuid, ARRAY['81678891-59cb-4722-af08-b26da56537e2'::uuid,'6149cd3e-e8cd-43bf-99e2-21bd0f07873f'::uuid,'b5320ab7-b677-4d77-b3f0-fcbf434867b5'::uuid]::uuid[]),
  ('46a8851d-4a8d-4015-b3ea-6bd2a7b13afd'::uuid, ARRAY['e3b7a805-209f-466d-be5a-d479e21078d8'::uuid,'5fd2fe24-2feb-4732-a22f-17a70555b99b'::uuid,'a8d0f327-1f80-4cd2-8531-32858b2b0f4c'::uuid]::uuid[]),
  ('1da54819-3f8b-4ec4-b72f-dda8e87ababf'::uuid, ARRAY['f7d124c8-475d-493c-a96a-3c8929d7f836'::uuid,'4f7f1f4e-ac77-4ce6-9e69-84c2bf86e9f9'::uuid,'ba9ca115-d7d0-457f-b175-027f3ab3a92c'::uuid]::uuid[]),
  ('f7d124c8-475d-493c-a96a-3c8929d7f836'::uuid, ARRAY['4f7f1f4e-ac77-4ce6-9e69-84c2bf86e9f9'::uuid,'ba9ca115-d7d0-457f-b175-027f3ab3a92c'::uuid,'9778f4c4-b446-469a-b17a-a4127e399c86'::uuid]::uuid[]),
  ('e3b7a805-209f-466d-be5a-d479e21078d8'::uuid, ARRAY['5fd2fe24-2feb-4732-a22f-17a70555b99b'::uuid,'a8d0f327-1f80-4cd2-8531-32858b2b0f4c'::uuid,'13480c1a-8516-470f-9626-ea6828e405c0'::uuid]::uuid[]),
  ('5fd2fe24-2feb-4732-a22f-17a70555b99b'::uuid, ARRAY['a8d0f327-1f80-4cd2-8531-32858b2b0f4c'::uuid,'13480c1a-8516-470f-9626-ea6828e405c0'::uuid,'11d0fc03-567c-41cb-a5cb-0825c2a602e7'::uuid]::uuid[]),
  ('3b9b1541-03f7-4096-9158-283dc94f9ddf'::uuid, ARRAY['21131e22-f270-40f2-bb17-eefe541ea042'::uuid,'7184f209-af82-441c-8b36-d4d4b4cbd202'::uuid,'8f4529b7-5497-4605-b2f7-46059a008b47'::uuid]::uuid[]),
  ('81678891-59cb-4722-af08-b26da56537e2'::uuid, ARRAY['6149cd3e-e8cd-43bf-99e2-21bd0f07873f'::uuid,'b5320ab7-b677-4d77-b3f0-fcbf434867b5'::uuid,'4c68acbf-aa90-4b41-81cc-aa78325a84e8'::uuid]::uuid[]),
  ('fef7902c-0338-445c-9bd8-d1f13386a317'::uuid, ARRAY['2849582e-19fe-479e-b415-8051cbf0348b'::uuid,'53f5ad1f-88eb-464a-8860-388ea30d675b'::uuid,'bd0ba88d-cfd7-47d5-abbf-536cd565ed8b'::uuid]::uuid[]),
  ('4f7f1f4e-ac77-4ce6-9e69-84c2bf86e9f9'::uuid, ARRAY['ba9ca115-d7d0-457f-b175-027f3ab3a92c'::uuid,'9778f4c4-b446-469a-b17a-a4127e399c86'::uuid,'6de0eb99-eec1-43b8-a8bf-15f488473950'::uuid]::uuid[]),
  ('a8d0f327-1f80-4cd2-8531-32858b2b0f4c'::uuid, ARRAY['13480c1a-8516-470f-9626-ea6828e405c0'::uuid,'11d0fc03-567c-41cb-a5cb-0825c2a602e7'::uuid,'92dac062-8633-4930-a85f-2a5457fe88fd'::uuid]::uuid[]),
  ('21131e22-f270-40f2-bb17-eefe541ea042'::uuid, ARRAY['7184f209-af82-441c-8b36-d4d4b4cbd202'::uuid,'8f4529b7-5497-4605-b2f7-46059a008b47'::uuid,'c39c04a1-925f-4726-b9cc-26ef2a59d7d3'::uuid]::uuid[]),
  ('37b9aeb3-1cc7-4983-b0da-058be49d7414'::uuid, ARRAY['397c24fc-8eaf-4aee-a1c1-bb96a79ea1d9'::uuid,'3db2ed23-2670-48c4-9f05-a552eb45d0f4'::uuid,'3e941ffd-c36a-4b9d-a55f-4181ab1b2f93'::uuid]::uuid[]),
  ('397c24fc-8eaf-4aee-a1c1-bb96a79ea1d9'::uuid, ARRAY['3db2ed23-2670-48c4-9f05-a552eb45d0f4'::uuid,'3e941ffd-c36a-4b9d-a55f-4181ab1b2f93'::uuid,'07a709ac-eef9-4046-ac4f-c4b63171ef39'::uuid]::uuid[]),
  ('6149cd3e-e8cd-43bf-99e2-21bd0f07873f'::uuid, ARRAY['b5320ab7-b677-4d77-b3f0-fcbf434867b5'::uuid,'4c68acbf-aa90-4b41-81cc-aa78325a84e8'::uuid,'81678891-59cb-4722-af08-b26da56537e2'::uuid]::uuid[]),
  ('13480c1a-8516-470f-9626-ea6828e405c0'::uuid, ARRAY['11d0fc03-567c-41cb-a5cb-0825c2a602e7'::uuid,'92dac062-8633-4930-a85f-2a5457fe88fd'::uuid,'b549b8ea-dc6c-40ed-ab1d-127c01ee52f5'::uuid]::uuid[]),
  ('2849582e-19fe-479e-b415-8051cbf0348b'::uuid, ARRAY['53f5ad1f-88eb-464a-8860-388ea30d675b'::uuid,'bd0ba88d-cfd7-47d5-abbf-536cd565ed8b'::uuid,'fef7902c-0338-445c-9bd8-d1f13386a317'::uuid]::uuid[])
) as v(id, related_ids)
where q.id = v.id;

do $$
declare
  expected integer := 240;
  found integer;
begin
  select count(*) into found from public.forge_v2_questions;
  if found <> expected then
    raise exception 'Import count mismatch. Expected %, found %.', expected, found;
  end if;
end $$;

commit;
