-- URISA ERP SSO | Corrige falso mapeo de paginas auxiliares.
-- La vista vw_user_page_access usa coalesce(p.appsmith_page,p.page_name),
-- por ello Reports/Route_Sheets/Test_Videos parecen paginas fisicas.
-- Cambiar SOLO funciones SSO generales, sin tocar vista compartida ni piloto.
begin;

create or replace function public.erp_general_page_grants_v1(
  p_app_token text
) returns table (
  page_name text,
  appsmith_page text,
  can_view boolean,
  can_edit boolean,
  is_admin boolean,
  full_name text,
  email text
)
language plpgsql stable security definer
set search_path = pg_catalog, public, urisa_auth, extensions, pg_temp
as $function$
begin
  if coalesce(p_app_token, '') !~ '^[A-Za-z0-9_-]{43}$' then
    return;
  end if;

  return query
    select v.page_name, pg.appsmith_page, v.can_view, v.can_edit,
           v.is_admin, v.full_name, v.email
    from urisa_auth.erp_sessions s
    join auth.users u on u.id = s.user_id
    join public.vw_user_page_access v
      on lower(v.email) = lower(u.email)
    join public.app_pages pg
      on pg.page_name = v.page_name and pg.is_active is true
    where s.app_token_hash =
      encode(extensions.digest(p_app_token, 'sha256'), 'hex')
      and s.app_token_expires_at > statement_timestamp()
      and s.revoked_at is null
      and s.expires_at > statement_timestamp()
      and public.erp_general_session_valid_v1(s.session_hash)
      and v.user_active is true
      and v.page_active is true
      and v.can_view is true
    order by v.sort_order, v.page_name;
end;
$function$;

create or replace function public.erp_general_can_access_page_v1(
  p_app_token text,
  p_appsmith_page text,
  p_require_edit boolean default false
) returns boolean
language plpgsql stable security definer
set search_path = pg_catalog, public, urisa_auth, extensions, pg_temp
as $function$
begin
  if coalesce(p_app_token, '') !~ '^[A-Za-z0-9_-]{43}$'
     or nullif(btrim(coalesce(p_appsmith_page,'')), '') is null
  then
    return false;
  end if;

  if p_appsmith_page = 'Home' then
    if coalesce(p_require_edit,false) then return false; end if;
    return exists (
      select 1 from public.erp_general_page_grants_v1(p_app_token) g
      where g.can_view is true and g.appsmith_page is not null
    );
  end if;

  -- Una pagina fisica exige mapeo EXPLICITO en app_pages.
  -- Los permisos auxiliares sin mapeo NUNCA habilitan Appsmith.
  return exists (
    select 1
    from public.erp_general_page_grants_v1(p_app_token) g
    join public.app_pages pg
      on pg.page_name = g.page_name
     and pg.appsmith_page = p_appsmith_page
     and pg.is_active is true
    where g.can_view is true
      and (not coalesce(p_require_edit,false) or g.can_edit is true)
  );
end;
$function$;

revoke all on function public.erp_general_page_grants_v1(text)
  from public, anon, authenticated;
revoke all on function public.erp_general_can_access_page_v1(text,text,boolean)
  from public, anon, authenticated;
grant execute on function public.erp_general_page_grants_v1(text) to service_role;
grant execute on function public.erp_general_can_access_page_v1(text,text,boolean) to service_role;
commit;