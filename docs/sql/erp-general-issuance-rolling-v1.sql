-- URISA general SSO issuance/binding/rolling for all authorized ERP pages.
-- Additive pilot-independent functions; no Nginx, PM2, UI or existing RPC replacement.
begin;

create or replace function public.erp_general_issue_login_code_v1(
  p_user_id uuid,
  p_source_session_id uuid,
  p_code_hash text,
  p_browser_nonce_hash text
) returns boolean
language plpgsql volatile security definer
set search_path = pg_catalog, public, urisa_auth, pg_temp
as $function$
begin
  if p_user_id is null or p_source_session_id is null
    or coalesce(p_code_hash,'') !~ '^[a-f0-9]{64}$'
    or coalesce(p_browser_nonce_hash,'') !~ '^[a-f0-9]{64}$'
    or public.erp_general_eligible_user_v1(p_user_id,p_source_session_id) is distinct from true
  then
    return false;
  end if;

  insert into urisa_auth.erp_login_codes(
    code_hash, browser_nonce_hash, user_id, source_session_id, expires_at
  ) values (
    p_code_hash, p_browser_nonce_hash, p_user_id, p_source_session_id,
    statement_timestamp() + interval '60 seconds'
  );
  return true;
end;
$function$;

create or replace function public.erp_general_bind_appsmith_token_v1(
  p_session_hash text,
  p_app_token_hash text
) returns boolean
language plpgsql volatile security definer
set search_path = pg_catalog, public, urisa_auth, pg_temp
as $function$
declare
  v_bound boolean := false;
begin
  if coalesce(p_session_hash, '') !~ '^[a-f0-9]{64}$'
    or coalesce(p_app_token_hash, '') !~ '^[a-f0-9]{64}$'
    or public.erp_general_session_valid_v1(p_session_hash) is distinct from true
  then
    return false;
  end if;

  update urisa_auth.erp_sessions s
    set app_token_hash = p_app_token_hash,
        app_token_expires_at =
          least(s.expires_at, statement_timestamp() + interval '15 minutes')
  where s.session_hash = p_session_hash
    and s.revoked_at is null
    and s.expires_at > statement_timestamp()
  returning true into v_bound;

  return coalesce(v_bound, false);
end;
$function$;

create or replace function public.erp_general_validate_rolling_v1(
  p_session_hash text
) returns boolean
language plpgsql volatile security definer
set search_path = pg_catalog, public, urisa_auth, pg_temp
as $function$
begin
  if coalesce(p_session_hash,'') !~ '^[a-f0-9]{64}$'
    or public.erp_general_session_valid_v1(p_session_hash) is distinct from true
  then
    return false;
  end if;

  update urisa_auth.erp_sessions s
    set app_token_expires_at =
      least(s.expires_at, statement_timestamp() + interval '15 minutes')
  where s.session_hash = p_session_hash
    and s.revoked_at is null
    and s.expires_at > statement_timestamp()
    and s.app_token_hash is not null
    and (s.app_token_expires_at is null
      or s.app_token_expires_at <= statement_timestamp() + interval '10 minutes');

  return true;
end;
$function$;

revoke all on function public.erp_general_issue_login_code_v1(uuid,uuid,text,text)
  from public, anon, authenticated;
revoke all on function public.erp_general_bind_appsmith_token_v1(text,text)
  from public, anon, authenticated;
revoke all on function public.erp_general_validate_rolling_v1(text)
  from public, anon, authenticated;

grant execute on function public.erp_general_issue_login_code_v1(uuid,uuid,text,text) to service_role;
grant execute on function public.erp_general_bind_appsmith_token_v1(text,text) to service_role;
grant execute on function public.erp_general_validate_rolling_v1(text) to service_role;
commit;

-- Rollback only if new general auth paths no longer reference these RPCs:
-- drop function if exists public.erp_general_validate_rolling_v1(text);
-- drop function if exists public.erp_general_bind_appsmith_token_v1(text,text);
-- drop function if exists public.erp_general_issue_login_code_v1(uuid,uuid,text,text);
