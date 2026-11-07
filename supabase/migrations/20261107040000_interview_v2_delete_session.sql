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
