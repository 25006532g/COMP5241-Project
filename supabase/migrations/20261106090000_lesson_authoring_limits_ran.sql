begin;

-- Prerequisites: existing base/resume migrations, 20261105093000_slide_authoring_ran.sql,
-- then 20261105140000_presentations_ran.sql (plus other earlier migrations in order).
-- Update ONLY the renamed legacy validator. The presentation wrapper, geometry,
-- asset trigger, standard quiz contract and service-only access remain untouched.
create or replace function public.forge_legacy_lesson_content_valid(v jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare n integer;
begin
  if jsonb_typeof(v) is distinct from 'object' or
     jsonb_typeof(v->'questions') is distinct from 'array' then return false; end if;
  n := jsonb_array_length(v->'questions');
  if v ? 'template' then
    if v->>'template' = 'slides' then
      if jsonb_typeof(v->'slides') is distinct from 'array' then return false; end if;
      if jsonb_array_length(v->'slides') not between 1 and 30 or
         not (n = 0 or n between 3 and 10) then return false; end if;
      if exists(select 1 from jsonb_array_elements(v->'slides') s
        where jsonb_typeof(s) is distinct from 'object' or
          jsonb_typeof(s->'title') is distinct from 'string' or
          jsonb_typeof(s->'body') is distinct from 'string' or
          length(btrim(s->>'title')) not between 1 and 100 or
          length(btrim(s->>'body')) < 1 or length(s->>'body') > 10000) then return false; end if;
    elsif v->>'template' is distinct from 'standard' then return false;
    elsif n <> 10 then return false;
    end if;
  elsif n <> 10 then return false;
  end if;
  return not exists(select 1 from jsonb_array_elements(v->'questions') q
    where jsonb_typeof(q) is distinct from 'object');
end;
$$;

-- NOT VALID preserves historical rows; new writes still enforce actual bounds.
alter table public.forge_resume drop constraint if exists forge_resume_position_check;
alter table public.forge_resume add constraint forge_resume_position_check check(
  slide >= 0 and slide < slide_count and
  ((lesson_format = 'legacy' and
    ((lesson_template = 'standard' and slide_count between 3 and 6 and slide <= 5) or
     (lesson_template = 'slides' and slide_count between 1 and 30 and slide <= 29))) or
   (lesson_format = 'presentation' and lesson_template = 'slides' and
    slide_count between 1 and 30 and slide <= 29))
) not valid;

revoke all on function public.forge_legacy_lesson_content_valid(jsonb) from public, anon, authenticated;
grant execute on function public.forge_legacy_lesson_content_valid(jsonb) to service_role;
commit;
