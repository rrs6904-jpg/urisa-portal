-- Seguridad por operación, ERP general: fail closed antes de invocar funciones legadas.
begin;
create or replace function public.erp_general_authorized_email_v1(
  p_app_token text,
  p_appsmith_page text,
  p_require_edit boolean
) returns text
language plpgsql stable security definer
set search_path = pg_catalog, public, urisa_auth, extensions, pg_temp
as $function$
declare
  v_email text;
begin
  if public.erp_general_can_access_page_v1(
    p_app_token, p_appsmith_page, p_require_edit
  ) is distinct from true then
    raise exception 'URISA_SSO_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select min(g.email) into v_email
  from public.erp_general_page_grants_v1(p_app_token) g
  where g.appsmith_page = p_appsmith_page
    and g.can_view is true
    and (not coalesce(p_require_edit,false) or g.can_edit is true);

  if v_email is null then
    raise exception 'URISA_SSO_NOT_AUTHORIZED' using errcode = '42501';
  end if;
  return v_email;
end;
$function$;
revoke all on function public.erp_general_authorized_email_v1(text,text,boolean)
  from public, anon, authenticated;
grant execute on function public.erp_general_authorized_email_v1(text,text,boolean)
  to service_role;
commit;