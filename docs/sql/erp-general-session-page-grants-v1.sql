-- URISA ERP SSO STAGE · permisos por sesion HttpOnly, solo lectura.
-- Implementacion aditiva. No modifica funciones SSO existentes.
-- Solamente el servidor service_role puede invocarla.
begin;

create function public.erp_general_session_page_grants_v1(p_session_hash text)
returns table (
  page_name text,
  appsmith_page text,
  can_view boolean,
  can_edit boolean,
  is_admin boolean,
  full_name text,
  email text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, urisa_auth, pg_temp
as $func$
begin
  if coalesce(p_session_hash, '') !~ '^[a-f0-9]{64}$'
     or public.erp_general_session_valid_v1(p_session_hash) is distinct from true
  then
    return;
  end if;

  return query
    select v.page_name, pg.appsmith_page, v.can_view, v.can_edit,
           v.is_admin, v.full_name, v.email
      from urisa_auth.erp_sessions s
      join auth.users u on u.id = s.user_id
      join public.vw_user_page_access v on lower(v.email) = lower(u.email)
      join public.app_pages pg
        on pg.page_name = v.page_name and pg.is_active is true
     where s.session_hash = p_session_hash
       and s.revoked_at is null
       and s.expires_at > statement_timestamp()
       and v.user_active is true
       and v.page_active is true
       and v.can_view is true
     order by v.sort_order, v.page_name;
end;
$func$;

revoke all on function public.erp_general_session_page_grants_v1(text) from public;
revoke all on function public.erp_general_session_page_grants_v1(text) from anon;
revoke all on function public.erp_general_session_page_grants_v1(text) from authenticated;
grant execute on function public.erp_general_session_page_grants_v1(text) to service_role;

comment on function public.erp_general_session_page_grants_v1(text)
  is 'Read-only stage SSO permission grants by SHA256 of valid HttpOnly session, service_role only.';
commit;
