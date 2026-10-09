-- URISA ERP PILOT — rolling Appsmith lease through Nginx auth_request.
-- Additive only. The existing erp_validate_session function is NOT changed.
-- Browser JS does not have to access HttpOnly cookies.
begin;

create or replace function public.erp_validate_session_rolling_v1(
  p_session_hash text
) returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, urisa_auth, extensions, pg_temp
as $function$
begin
  -- Authoritative check: current ERP session, source Supabase session,
  -- active employee, and Ops_Board access. Fail closed.
  if coalesce(p_session_hash, '') !~ '^[a-f0-9]{64}$'
     or public.erp_validate_session(p_session_hash) is distinct from true then
    return false;
  end if;

  -- Extend only the Appsmith credential, never the parent 8-hour ERP session.
  -- Refresh only when <= 10 minutes remain (reduces writes under load).
  -- This also supports a browser resuming after >15 minutes idle.
  update urisa_auth.erp_sessions s
     set app_token_expires_at =
         least(s.expires_at, statement_timestamp() + interval '15 minutes')
   where s.session_hash = p_session_hash
     and s.revoked_at is null
     and s.expires_at > statement_timestamp()
     and s.app_token_hash is not null
     and (
       s.app_token_expires_at is null
       or s.app_token_expires_at <= statement_timestamp() + interval '10 minutes'
     );

  return true;
end;
$function$;

revoke all on function public.erp_validate_session_rolling_v1(text)
  from public, anon, authenticated;
grant execute on function public.erp_validate_session_rolling_v1(text)
  to service_role;

commit;

-- Rollback AFTER rolling checker no longer uses function:
-- drop function if exists public.erp_validate_session_rolling_v1(text);
