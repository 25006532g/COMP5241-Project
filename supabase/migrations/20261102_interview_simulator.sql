-- Additive focus choices; existing private histories, RPCs and grants are unchanged.
begin;
alter table public.forge_interviews drop constraint forge_interviews_topic_check;
alter table public.forge_interviews add constraint forge_interviews_topic_check
  check (topic in ('technical','projects','teamwork','planning','requirements','design',
    'implementation','testing','deployment','maintenance','delegation','boundaries',
    'verification','prioritization','communication'));
commit;
