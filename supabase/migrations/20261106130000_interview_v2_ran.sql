-- Interview simulator v2. Separate from forge_interviews. Service role can read;
-- writes go through security-definer functions only.
begin;

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
commit;
