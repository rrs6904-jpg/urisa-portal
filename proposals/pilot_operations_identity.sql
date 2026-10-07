-- PROPOSED ONLY. Not applied or validated against test accounts.
-- Separate new read-only RPC; no changes to legacy functions, permissions or data.
-- Execute only through trusted PostgREST JWT validation, never client-set SQL claims.
BEGIN;
CREATE FUNCTION public.pilot_operations_identity()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  actor_email text;
  session_claim text := auth.jwt()->>'session_id';
  expiry_claim text := auth.jwt()->>'exp';
  payload jsonb;
BEGIN
  IF auth.uid() IS NULL OR session_claim IS NULL OR expiry_claim IS NULL THEN
    RAISE EXCEPTION 'Operations access denied' USING ERRCODE='42501';
  END IF;
  IF session_claim !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     OR expiry_claim !~ '^[0-9]{1,12}$' THEN
    RAISE EXCEPTION 'Operations access denied' USING ERRCODE='42501';
  END IF;
  IF to_timestamp(expiry_claim::double precision) <= statement_timestamp() THEN
    RAISE EXCEPTION 'Operations access denied' USING ERRCODE='42501';
  END IF;

  SELECT lower(u.email) INTO actor_email
  FROM auth.users u
  JOIN auth.sessions s ON s.user_id = u.id AND s.id = session_claim::uuid
  JOIN public.profiles p ON p.id = u.id AND p.is_active IS TRUE
  JOIN public.app_users a ON lower(a.email) = lower(u.email) AND a.is_active IS TRUE
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
    AND (u.banned_until IS NULL OR u.banned_until <= statement_timestamp())
    AND (s.not_after IS NULL OR s.not_after > statement_timestamp())
    AND EXISTS (SELECT 1 FROM public.app_pages pg
                WHERE pg.page_name='Ops_Board' AND pg.appsmith_page='Operations' AND pg.is_active IS TRUE)
    AND (a.is_admin IS TRUE OR EXISTS (
      SELECT 1 FROM public.user_page_access x
      WHERE lower(x.user_email)=lower(u.email) AND x.page_name='Ops_Board' AND x.can_view IS TRUE
    ));
  IF actor_email IS NULL THEN
    RAISE EXCEPTION 'Operations access denied' USING ERRCODE='42501';
  END IF;

  SELECT to_jsonb(v) INTO payload FROM public.ops_viewer(actor_email) v;
  IF payload IS NULL THEN
    RAISE EXCEPTION 'Operations access denied' USING ERRCODE='42501';
  END IF;
  RETURN payload;
END;
$function$;
REVOKE ALL ON FUNCTION public.pilot_operations_identity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_operations_identity() TO authenticated;
COMMIT;

-- Rollback, after removing the pilot route: DROP FUNCTION public.pilot_operations_identity();
-- Pending: SQL permission/identity tests, logout and deactivation, portal build.
-- Checks not_after and session existence; custom inactivity/max-age policy remains to design.
