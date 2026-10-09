-- URISA ERP PILOT ONLY — rolling Appsmith token expiration (15 minutes).
-- Adds a new RPC; does not replace existing production functions.
-- A valid ERP HttpOnly session cookie AND the current Appsmith token are
-- required by /urisa-auth/refresh. Neither value grants renewal by itself.
begin;

create or replace function public.erp_refresh_appsmith_token_v1(
  p_session_hash text,
  p_app_token_hash text
) returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, urisa_auth, extensions, pg_temp
as $function$
declare
  v_refreshed boolean := false;
begin
  if coalesce(p_session_hash, '') !~ '^[a-f0-9]{64}$'
     or coalesce(p_app_token_hash, '') !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  -- Verifies ERP session, live Supabase source session, active user and Ops_Board
  -- permission. Invalid / revoked sessions never reach the UPDATE.
  if public.erp_validate_session(p_session_hash) is distinct from true then
    return false;
  end if;

  -- Allow a suspended browser to resume even if its 15-minute app-token
  -- lease elapsed, provided the parent ERP session is STILL valid.
  -- Preserve the original token/hash (no race with in-flight queries or tabs).
  update urisa_auth.erp_sessions s
     set app_token_expires_at =
       least(s.expires_at, statement_timestamp() + interval '15 minutes')
   where s.session_hash = p_session_hash
     and s.app_token_hash = p_app_token_hash
     and s.app_token_expires_at is not null
     and s.revoked_at is null
     and s.expires_at > statement_timestamp()
  returning true into v_refreshed;

  return coalesce(v_refreshed, false);
end;
$function$;

revoke all on function public.erp_refresh_appsmith_token_v1(text,text)
  from public, anon, authenticated;
grant execute on function public.erp_refresh_appsmith_token_v1(text,text)
  to service_role;

commit;

-- Rollback (ONLY if pilot no longer calls /urisa-auth/refresh):
-- drop function if exists public.erp_refresh_appsmith_token_v1(text,text);
