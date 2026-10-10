-- URISA ERP 22-page SSO: additive, non-breaking server-only permission foundation.
-- Pilot Operations procedures and current portal/Nginx routing are unchanged.
begin;

create or replace function public.erp_general_eligible_user_v1(
  p_user_id uuid,
  p_source_session_id uuid
) returns boolean
language sql stable security definer
set search_path = pg_catalog, public, urisa_auth, pg_temp
as $function$
  select exists (
    select 1
    from auth.users u
    join auth.sessions sess
      on sess.id = p_source_session_id and sess.user_id = u.id
    join public.profiles pr
      on pr.id = u.id and pr.is_active is true
    join public.app_users au
      on lower(au.email) = lower(u.email) and au.is_active is true
    where u.id = p_user_id
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= statement_timestamp())
      and (sess.not_after is null or sess.not_after > statement_timestamp())
      and (
        au.is_admin is true
        or exists (
          select 1
          from public.user_page_access acc
          join public.app_pages pg
            on pg.page_name = acc.page_name and pg.is_active is true
          where lower(acc.user_email) = lower(u.email)
            and acc.can_view is true
        )
      )
  );
$function$;

create or replace function public.erp_general_session_valid_v1(
  p_session_hash text
) returns boolean
language sql stable security definer
set search_path = pg_catalog, public, urisa_auth, pg_temp
as $function$
  select
    coalesce(p_session_hash, '') ~ '^[a-f0-9]{64}$'
    and exists (
      select 1
      from urisa_auth.erp_sessions s
      where s.session_hash = p_session_hash
        and s.revoked_at is null
        and s.expires_at > statement_timestamp()
        and public.erp_general_eligible_user_v1(s.user_id, s.source_session_id)
    );
$function$;

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
    select v.page_name, v.appsmith_page, v.can_view, v.can_edit,
           v.is_admin, v.full_name, v.email
    from urisa_auth.erp_sessions s
    join auth.users u on u.id = s.user_id
    join public.vw_user_page_access v
      on lower(v.email) = lower(u.email)
    where s.app_token_hash = encode(extensions.digest(p_app_token, 'sha256'), 'hex')
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

revoke all on function public.erp_general_eligible_user_v1(uuid,uuid) from public, anon, authenticated;
revoke all on function public.erp_general_session_valid_v1(text) from public, anon, authenticated;
revoke all on function public.erp_general_page_grants_v1(text) from public, anon, authenticated;

grant execute on function public.erp_general_eligible_user_v1(uuid,uuid) to service_role;
grant execute on function public.erp_general_session_valid_v1(text) to service_role;
grant execute on function public.erp_general_page_grants_v1(text) to service_role;

commit;

-- Rollback only if no new backend references them:
-- drop function if exists public.erp_general_page_grants_v1(text);
-- drop function if exists public.erp_general_session_valid_v1(text);
-- drop function if exists public.erp_general_eligible_user_v1(uuid,uuid);
