begin;
create or replace function public.erp_general_can_access_page_v1(
  p_app_token text,
  p_appsmith_page text,
  p_require_edit boolean default false
) returns boolean
language plpgsql stable security definer
set search_path = pg_catalog, public, urisa_auth, extensions, pg_temp
as $function$
begin
  if coalesce(p_app_token,'') !~ '^[A-Za-z0-9_-]{43}$'
    or nullif(btrim(coalesce(p_appsmith_page,'')), '') is null
  then
    return false;
  end if;

  -- 'Home' is a read-only safe landing page, not a permission escalation.
  -- User must have at least one active, verified ERP grant.
  if p_appsmith_page = 'Home' then
    if coalesce(p_require_edit,false) then return false; end if;
    return exists (
      select 1 from public.erp_general_page_grants_v1(p_app_token) g
      where g.can_view is true
    );
  end if;

  -- Only real Appsmith pages mapped in app_pages grant access.
  -- Unmapped physical pages (currently MLB) fail closed by design.
  return exists (
    select 1 from public.erp_general_page_grants_v1(p_app_token) g
    where g.appsmith_page = p_appsmith_page
      and g.can_view is true
      and (coalesce(p_require_edit,false) is false or g.can_edit is true)
  );
end;
$function$;

revoke all on function public.erp_general_can_access_page_v1(text,text,boolean)
 from public, anon, authenticated;
grant execute on function public.erp_general_can_access_page_v1(text,text,boolean)
 to service_role;
commit;

-- Rollback if not yet referenced by a deployed application:
-- drop function if exists public.erp_general_can_access_page_v1(text,text,boolean);
