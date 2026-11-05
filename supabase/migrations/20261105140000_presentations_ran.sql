begin;

-- Additive only. Historical _ran files and rows are not rewritten.
do $$ begin
  if to_regprocedure('public.forge_legacy_lesson_content_valid(jsonb)') is null then
    alter function public.forge_lesson_content_valid(jsonb) rename to forge_legacy_lesson_content_valid;
  end if;
end $$;

create or replace function public.forge_presentation_valid(v jsonb)
returns boolean language plpgsql immutable set search_path=public as $$
declare s jsonb; e jsonb; p jsonb; r jsonb; ids text[] := '{}'; n integer; characters integer;
begin
  if jsonb_typeof(v) is distinct from 'object' or v->>'template' is distinct from 'slides' or
    v->>'format' is distinct from 'presentation' or v->'schemaVersion' is distinct from '1'::jsonb or
    v->'width' is distinct from '960'::jsonb or v->'height' is distinct from '540'::jsonb or
    jsonb_typeof(v->'slides') is distinct from 'array' or jsonb_typeof(v->'questions') is distinct from 'array' or
    length(v::text)>1800000 then return false; end if;
  if jsonb_array_length(v->'slides') not between 1 and 30 then return false; end if;
  n:=jsonb_array_length(v->'questions');
  if not(n=0 or n between 3 and 10) then return false; end if;
  for s in select * from jsonb_array_elements(v->'slides') loop
    if jsonb_typeof(s) is distinct from 'object' or
      coalesce(s->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or
      s->>'id'=any(ids) or jsonb_typeof(s->'title') is distinct from 'string' or
      length(btrim(s->>'title')) not between 1 and 100 or coalesce(s->>'background','') !~ '^#[0-9a-fA-F]{6}$' or
      jsonb_typeof(s->'elements') is distinct from 'array' then return false; end if;
    ids:=array_append(ids,s->>'id');
    if jsonb_array_length(s->'elements')>100 then return false; end if;
    for e in select * from jsonb_array_elements(s->'elements') loop
      if jsonb_typeof(e) is distinct from 'object' or
        coalesce(e->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or e->>'id'=any(ids) or
        jsonb_typeof(e->'x') is distinct from 'number' or jsonb_typeof(e->'y') is distinct from 'number' or
        jsonb_typeof(e->'w') is distinct from 'number' or jsonb_typeof(e->'h') is distinct from 'number' or
        jsonb_typeof(e->'rotation') is distinct from 'number' then return false; end if;
      ids:=array_append(ids,e->>'id');
      if (e->>'x')::numeric<0 or (e->>'y')::numeric<0 or
        (e->>'w')::numeric not between 1 and 960 or (e->>'h')::numeric not between 1 and 540 or
        (e->>'x')::numeric+(e->>'w')::numeric>960.01 or (e->>'y')::numeric+(e->>'h')::numeric>540.01 or
        (e->>'rotation')::numeric not between -360 and 360 then return false; end if;
      if exists(select 1 from (values(0::numeric,0::numeric),((e->>'w')::numeric,0::numeric),
          (0::numeric,(e->>'h')::numeric),((e->>'w')::numeric,(e->>'h')::numeric)) c(dx,dy)
        where (e->>'x')::numeric+dx*cos(radians((e->>'rotation')::numeric))-dy*sin(radians((e->>'rotation')::numeric)) not between -.01 and 960.01 or
          (e->>'y')::numeric+dx*sin(radians((e->>'rotation')::numeric))+dy*cos(radians((e->>'rotation')::numeric)) not between -.01 and 540.01) then return false; end if;
      if e->>'type'='text' then
        if coalesce(e->>'align','') not in ('left','center','right') or jsonb_typeof(e->'paragraphs') is distinct from 'array' then return false; end if;
        if jsonb_array_length(e->'paragraphs') not between 1 and 100 then return false; end if;
        characters:=0;
        for p in select * from jsonb_array_elements(e->'paragraphs') loop
          if jsonb_typeof(p->'runs') is distinct from 'array' then return false; end if;
          if jsonb_array_length(p->'runs') not between 1 and 1000 then return false; end if;
          for r in select * from jsonb_array_elements(p->'runs') loop
            if jsonb_typeof(r->'text') is distinct from 'string' or
              coalesce(r->>'font','') not in ('Arial','Calibri','Times New Roman','Courier New','Noto Sans CJK SC') or
              coalesce(r->>'color','') !~ '^#[0-9a-fA-F]{6}$' or jsonb_typeof(r->'size') is distinct from 'number' or
              jsonb_typeof(r->'bold') is distinct from 'boolean' or jsonb_typeof(r->'italic') is distinct from 'boolean' or
              jsonb_typeof(r->'underline') is distinct from 'boolean' then return false; end if;
            if (r->>'size')::numeric not between 8 and 120 then return false; end if;
            characters:=characters+length(r->>'text')+1;
          end loop;
        end loop;
        if characters>11000 then return false; end if;
      elsif e->>'type'='image' then
        if coalesce(e->>'assetId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or
          jsonb_typeof(e->'alt') is distinct from 'string' or length(btrim(e->>'alt')) not between 1 and 300 or
          jsonb_typeof(e->'ratio') is distinct from 'number' then return false; end if;
        if (e->>'ratio')::numeric not between .001 and 1000 or
          abs((e->>'w')::numeric/(e->>'h')::numeric/(e->>'ratio')::numeric-1)>.02 then return false; end if;
      elsif e->>'type'='shape' then
        if coalesce(e->>'shape','') not in ('rect','roundedrect','ellipse','line','arrow') or
          coalesce(e->>'fill','') !~ '^#[0-9a-fA-F]{6}$' or coalesce(e->>'stroke','') !~ '^#[0-9a-fA-F]{6}$' or
          jsonb_typeof(e->'strokeWidth') is distinct from 'number' then return false; end if;
        if (e->>'strokeWidth')::numeric not between 0 and 20 then return false; end if;
      else return false;
      end if;
    end loop;
  end loop;
  return not exists(select 1 from jsonb_array_elements(v->'questions') q where
    jsonb_typeof(q->'prompt') is distinct from 'string' or length(btrim(q->>'prompt')) not between 1 and 300 or
    jsonb_typeof(q->'options') is distinct from 'array' or
    jsonb_typeof(q->'correct') is distinct from 'number' or coalesce(q->>'correct','') !~ '^[0-3]$' or
    jsonb_typeof(q->'explanation') is distinct from 'string')
    and not exists(select 1 from jsonb_array_elements(v->'questions') q where jsonb_array_length(q->'options')<>4);
exception when others then return false;
end $$;
create or replace function public.forge_lesson_content_valid(v jsonb)
returns boolean language sql immutable set search_path=public as $$
  select case when v->>'format'='presentation' then public.forge_presentation_valid(v)
    else public.forge_legacy_lesson_content_valid(v) end;
$$;
alter table public.forge_lessons drop constraint if exists forge_lessons_content_check;
alter table public.forge_lessons add constraint forge_lessons_content_check check(public.forge_lesson_content_valid(content) is true) not valid;

create table if not exists public.forge_presentation_drafts(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  lesson_id uuid references public.forge_lessons(id) on delete set null,
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days'
);
create table if not exists public.forge_presentation_assets(
  id uuid primary key, draft_id uuid not null references public.forge_presentation_drafts(id),
  owner_id uuid not null references auth.users(id),
  storage_path text not null unique, mime text not null default 'image/png' check(mime='image/png'),
  bytes integer not null check(bytes between 1 and 4194304),
  width integer not null check(width between 1 and 8000),height integer not null check(height between 1 and 8000),
  status text not null default 'pending' check(status in ('pending','ready','deleting')),
  created_at timestamptz not null default now(), check(width::bigint*height<=16000000)
);
create index if not exists forge_presentation_assets_owner on public.forge_presentation_assets(owner_id);
create index if not exists forge_presentation_assets_draft on public.forge_presentation_assets(draft_id);
alter table public.forge_presentation_drafts enable row level security;
alter table public.forge_presentation_assets enable row level security;
revoke all on public.forge_presentation_drafts,public.forge_presentation_assets from public,anon,authenticated;
grant select,insert,update,delete on public.forge_presentation_drafts,public.forge_presentation_assets to service_role;

create or replace function public.forge_begin_presentation_draft(request_owner uuid,request_lesson uuid)
returns uuid language plpgsql set search_path=public as $$
declare result uuid;
begin
  perform pg_advisory_xact_lock(hashtext(request_owner::text));
  if (select count(*) from forge_presentation_drafts where owner_id=request_owner and expires_at>now())>=10 then raise exception 'draft limit'; end if;
  insert into forge_presentation_drafts(owner_id,lesson_id) values(request_owner,request_lesson) returning id into result;
  return result;
end $$;
create or replace function public.forge_reserve_presentation_asset(request_draft uuid,request_editor uuid,request_owner uuid,
  request_id uuid,request_path text,request_bytes integer,request_width integer,request_height integer)
returns void language plpgsql set search_path=public as $$
declare d forge_presentation_drafts;
begin
  select * into d from forge_presentation_drafts where id=request_draft for update;
  if d.id is null or d.owner_id is distinct from request_editor or d.expires_at<=now() then raise exception 'draft unavailable'; end if;
  if request_owner is distinct from coalesce((select owner_id from forge_lessons where id=d.lesson_id),request_editor) then raise exception 'owner mismatch'; end if;
  if request_path<>request_draft::text||'/'||request_id::text||'.png' then raise exception 'invalid path'; end if;
  if (select coalesce(sum(bytes),0) from forge_presentation_assets where draft_id=request_draft)+request_bytes>67108864 or
    (select count(*) from forge_presentation_assets where draft_id=request_draft)>=3000 then raise exception 'asset limit'; end if;
  insert into forge_presentation_assets(id,draft_id,owner_id,storage_path,bytes,width,height)
    values(request_id,request_draft,request_owner,request_path,request_bytes,request_width,request_height);
end $$;

create or replace function public.forge_presentation_asset_ids(v jsonb)
returns setof uuid language sql immutable set search_path=public as $$
  select distinct (e->>'assetId')::uuid from jsonb_array_elements(
    case when v->>'format'='presentation' then v->'slides' else '[]'::jsonb end) s,
    jsonb_array_elements(s->'elements') e where e->>'type'='image';
$$;
-- Row locks couple saves to GC claims: deleting/pending assets cannot become
-- persisted references, and a committed saved reference cannot be collected.
create or replace function public.forge_check_presentation_assets()
returns trigger language plpgsql set search_path=public as $$
declare asset uuid; a forge_presentation_assets;
begin
  if new.content->>'format'='presentation' then
    for asset in select * from forge_presentation_asset_ids(new.content) loop
      select * into a from forge_presentation_assets where id=asset for share;
      if a.id is null or a.status<>'ready' or a.owner_id<>new.owner_id then raise exception 'presentation asset unavailable' using errcode='23514'; end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists forge_check_presentation_assets on public.forge_lessons;
create trigger forge_check_presentation_assets before insert or update of content on public.forge_lessons for each row execute function public.forge_check_presentation_assets();

create or replace function public.forge_claim_presentation_cleanup(request_owner uuid,deleting_account boolean default false)
returns table(id uuid,storage_path text) language plpgsql set search_path=public as $$
begin
  return query
    with candidates as (
      select a.id from forge_presentation_assets a join forge_presentation_drafts d on d.id=a.draft_id
      where (request_owner is null and not deleting_account or a.owner_id=request_owner or d.owner_id=request_owner) and
        (deleting_account and a.owner_id=request_owner or d.expires_at<=now()) and
        (deleting_account and a.owner_id=request_owner or not exists(
          select 1 from forge_lessons l where a.id in (select forge_presentation_asset_ids(l.content))))
      for update of a skip locked
    )
    update forge_presentation_assets a set status='deleting' from candidates c where a.id=c.id
      returning a.id,a.storage_path;
end $$;

alter table public.forge_resume add column if not exists lesson_format text not null default 'legacy';
alter table public.forge_resume add column if not exists slide_count integer not null default 6;
alter table public.forge_resume drop constraint if exists forge_resume_slide_check;
alter table public.forge_resume drop constraint if exists forge_resume_position_check;
alter table public.forge_resume add constraint forge_resume_position_check check(
  slide>=0 and slide<slide_count and
  ((lesson_format='legacy' and slide_count between 3 and 6 and slide<=5) or
   (lesson_format='presentation' and lesson_template='slides' and slide_count between 1 and 30 and slide<=29))
) not valid;

revoke all on function public.forge_presentation_valid(jsonb),public.forge_lesson_content_valid(jsonb),
  public.forge_legacy_lesson_content_valid(jsonb),public.forge_presentation_asset_ids(jsonb),
  public.forge_check_presentation_assets(),public.forge_begin_presentation_draft(uuid,uuid),
  public.forge_reserve_presentation_asset(uuid,uuid,uuid,uuid,text,integer,integer,integer),
  public.forge_claim_presentation_cleanup(uuid,boolean) from public,anon,authenticated;
grant execute on function public.forge_presentation_valid(jsonb),public.forge_lesson_content_valid(jsonb),
  public.forge_legacy_lesson_content_valid(jsonb),public.forge_presentation_asset_ids(jsonb),
  public.forge_check_presentation_assets(),public.forge_begin_presentation_draft(uuid,uuid),
  public.forge_reserve_presentation_asset(uuid,uuid,uuid,uuid,text,integer,integer,integer),
  public.forge_claim_presentation_cleanup(uuid,boolean) to service_role;

-- Local PGlite has no Storage schema. On Supabase provision a PRIVATE bucket;
-- no browser Storage policies. All image access is via authenticated server code.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    execute $q$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
      values('forge-presentation-images','forge-presentation-images',false,4194304,array['image/png'])
      on conflict(id) do nothing$q$;
    if exists(select 1 from storage.buckets where id='forge-presentation-images' and public=true) then raise exception 'presentation bucket must be private'; end if;
  end if;
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists forge_private_presentation_images on storage.objects';
    execute $q$create policy forge_private_presentation_images on storage.objects as restrictive
      for all to anon,authenticated using(bucket_id<>'forge-presentation-images')
      with check(bucket_id<>'forge-presentation-images')$q$;
  end if;
end $$;
commit;
