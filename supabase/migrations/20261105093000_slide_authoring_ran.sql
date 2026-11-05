begin;

-- Preserve every historical row (including legacy rows that the old CHECK
-- admitted through SQL NULL). NOT VALID still enforces all new writes/updates.
create or replace function public.forge_lesson_content_valid(v jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare n integer;
begin
  if jsonb_typeof(v) is distinct from 'object' or
     jsonb_typeof(v->'questions') is distinct from 'array' then return false; end if;
  n := jsonb_array_length(v->'questions');
  if v ? 'template' then
    if v->>'template' = 'slides' then
      if jsonb_typeof(v->'slides') is distinct from 'array' then return false; end if;
      if jsonb_array_length(v->'slides') not between 3 and 6 or
         not (n = 0 or n between 3 and 10) then return false; end if;
      if exists(select 1 from jsonb_array_elements(v->'slides') s
        where jsonb_typeof(s) is distinct from 'object' or
          jsonb_typeof(s->'title') is distinct from 'string' or
          jsonb_typeof(s->'body') is distinct from 'string' or
          length(btrim(s->>'title')) not between 1 and 100 or
          length(btrim(s->>'body')) not between 1 and 400) then return false; end if;
    elsif v->>'template' is distinct from 'standard' then return false;
    elsif n <> 10 then return false;
    end if;
  elsif n <> 10 then return false;
  end if;
  return not exists(select 1 from jsonb_array_elements(v->'questions') q
    where jsonb_typeof(q) is distinct from 'object');
end;
$$;
alter table public.forge_lessons drop constraint if exists forge_lessons_content_check;
alter table public.forge_lessons add constraint forge_lessons_content_check
  check (public.forge_lesson_content_valid(content) is true) not valid;

-- An explicit snapshot discriminator preserves the standard ten-answer rule.
alter table public.forge_attempts add column if not exists lesson_template text not null default 'standard';
create or replace function public.forge_attempt_valid(t text, a jsonb, q jsonb, s integer)
returns boolean language plpgsql immutable set search_path = public as $$
declare n integer;
begin
  if jsonb_typeof(a) is distinct from 'array' or jsonb_typeof(q) is distinct from 'array' then return false; end if;
  n := jsonb_array_length(q);
  if t is null or t not in ('standard','slides') or
    (t = 'standard' and n <> 10) or (t = 'slides' and n not between 3 and 10) or
    jsonb_array_length(a) <> n or s is null or s not between 0 and n then return false; end if;
  return not exists(select 1 from jsonb_array_elements(a) x
    where jsonb_typeof(x) is distinct from 'number' or x::text !~ '^[0-3]$')
    and not exists(select 1 from jsonb_array_elements(q) x where jsonb_typeof(x) is distinct from 'object');
end;
$$;
alter table public.forge_attempts drop constraint if exists forge_attempts_answers_check;
alter table public.forge_attempts drop constraint if exists forge_attempts_score_check;
alter table public.forge_attempts drop constraint if exists forge_attempts_quiz_check;
alter table public.forge_attempts add constraint forge_attempts_quiz_check
  check (public.forge_attempt_valid(lesson_template, answers, questions, score) is true) not valid;

alter table public.forge_resume add column if not exists lesson_template text not null default 'standard';
alter table public.forge_resume add column if not exists question_count integer not null default 10;
alter table public.forge_resume drop constraint if exists forge_resume_answers_check;
alter table public.forge_resume add constraint forge_resume_answers_check check (
  lesson_template in ('standard','slides') and
  ((lesson_template = 'standard' and question_count = 10) or
   (lesson_template = 'slides' and (question_count = 0 or question_count between 3 and 10))) and
  cardinality(answers) = question_count and
  (question_count = 0 or array_ndims(answers) = 1) and
  array_position(answers, null) is null and
  answers <@ array[-1,0,1,2,3] and
  (lesson_template <> 'slides' or (stage <> 'activity' and (question_count > 0 or stage <> 'quiz')))
) not valid;

revoke all on function public.forge_lesson_content_valid(jsonb),
  public.forge_attempt_valid(text,jsonb,jsonb,integer) from public, anon, authenticated;
grant execute on function public.forge_lesson_content_valid(jsonb),
  public.forge_attempt_valid(text,jsonb,jsonb,integer) to service_role;
commit;
