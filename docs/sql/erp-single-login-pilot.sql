-- DRAFT ONLY — DO NOT APPLY UNTIL REVIEWED.
-- URISA ERP single-login pilot persistence.
-- Keeps state outside the exposed public schema; no Appsmith tables/functions are modified.

begin;

create schema if not exists urisa_auth;
revoke all on schema urisa_auth from public, anon, authenticated;
grant usage on schema urisa_auth to postgres, service_role;

create table if not exists urisa_auth.erp_login_codes (
  id bigint generated always as identity primary key,
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  browser_nonce_hash text not null check (browser_nonce_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_session_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint erp_login_codes_expiry check (expires_at > created_at)
);

create index if not exists erp_login_codes_expiry_idx
  on urisa_auth.erp_login_codes (expires_at)
  where consumed_at is null;

create table if not exists urisa_auth.erp_sessions (
  id bigint generated always as identity primary key,
  session_hash text not null unique check (session_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_session_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now(),
  constraint erp_sessions_expiry check (expires_at > created_at)
);

create index if not exists erp_sessions_active_idx
  on urisa_auth.erp_sessions (session_hash, expires_at)
  where revoked_at is null;

alter table urisa_auth.erp_login_codes enable row level security;
alter table urisa_auth.erp_sessions enable row level security;

revoke all on urisa_auth.erp_login_codes from public, anon, authenticated;
revoke all on urisa_auth.erp_sessions from public, anon, authenticated;
grant select, insert, update, delete on urisa_auth.erp_login_codes to service_role;
grant select, insert, update, delete on urisa_auth.erp_sessions to service_role;
grant usage, select on all sequences in schema urisa_auth to service_role;

create or replace function public.erp_issue_login_code(
  p_code_hash text,
  p_browser_nonce_hash text
) returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, urisa_auth, pg_temp
as $function$
declare
  v_session_id uuid;
  v_email text;
begin
  if auth.uid() is null
     or p_code_hash !~ '^[a-f0-9]{64}$'
     or p_browser_nonce_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'ERP authorization denied' using errcode='42501';
  end if;

  begin
    v_session_id := nullif(auth.jwt()->>'session_id','')::uuid;
  exception when others then
    raise exception 'ERP authorization denied' using errcode='42501';
  end;

  if v_session_id is null then
    raise exception 'ERP authorization denied' using errcode='42501';
  end if;

  select lower(u.email)
    into v_email
  from auth.users u
  join auth.sessions s
    on s.id = v_session_id
   and s.user_id = u.id
  join public.profiles p
    on p.id = u.id
   and p.is_active is true
  join public.app_users a
    on lower(a.email)=lower(u.email)
   and a.is_active is true
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until <= statement_timestamp())
    and (s.not_after is null or s.not_after > statement_timestamp())
    and exists (
      select 1
      from public.app_pages pg
      where pg.page_name='Ops_Board'
        and pg.appsmith_page='Operations'
        and pg.is_active is true
    )
    and (
      a.is_admin is true
      or exists (
        select 1
        from public.user_page_access x
        where lower(x.user_email)=lower(u.email)
          and x.page_name='Ops_Board'
          and x.can_view is true
      )
    );

  if v_email is null then
    raise exception 'ERP authorization denied' using errcode='42501';
  end if;

  delete from urisa_auth.erp_login_codes
   where expires_at < now() - interval '5 minutes'
      or consumed_at < now() - interval '5 minutes';

  insert into urisa_auth.erp_login_codes(
    code_hash, browser_nonce_hash, user_id, source_session_id, expires_at
  ) values (
    p_code_hash, p_browser_nonce_hash, auth.uid(), v_session_id, now() + interval '60 seconds'
  );

  return true;
end;
$function$;

revoke all on function public.erp_issue_login_code(text,text) from public, anon, authenticated;
grant execute on function public.erp_issue_login_code(text,text) to authenticated;

create or replace function public.erp_exchange_login_code(
  p_code_hash text,
  p_browser_nonce_hash text,
  p_session_hash text
) returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, urisa_auth, pg_temp
as $function$
declare
  v_code urisa_auth.erp_login_codes%rowtype;
begin
  if p_code_hash !~ '^[a-f0-9]{64}$'
     or p_browser_nonce_hash !~ '^[a-f0-9]{64}$'
     or p_session_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  update urisa_auth.erp_login_codes
     set consumed_at = now()
   where code_hash = p_code_hash
     and browser_nonce_hash = p_browser_nonce_hash
     and consumed_at is null
     and expires_at > now()
  returning * into v_code;

  if not found then
    return false;
  end if;

  if not exists (
    select 1
    from auth.users u
    join auth.sessions s
      on s.id=v_code.source_session_id
     and s.user_id=u.id
    join public.profiles p
      on p.id=u.id and p.is_active is true
    join public.app_users a
      on lower(a.email)=lower(u.email) and a.is_active is true
    where u.id=v_code.user_id
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= statement_timestamp())
      and (s.not_after is null or s.not_after > statement_timestamp())
  ) then
    return false;
  end if;

  insert into urisa_auth.erp_sessions(
    session_hash, user_id, source_session_id, expires_at
  ) values (
    p_session_hash, v_code.user_id, v_code.source_session_id, now() + interval '8 hours'
  );

  return true;
end;
$function$;

revoke all on function public.erp_exchange_login_code(text,text,text) from public, anon, authenticated;
grant execute on function public.erp_exchange_login_code(text,text,text) to service_role;

create or replace function public.erp_validate_session(
  p_session_hash text
) returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, urisa_auth, pg_temp
as $function$
declare
  v_session urisa_auth.erp_sessions%rowtype;
begin
  if p_session_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  select *
    into v_session
  from urisa_auth.erp_sessions
  where session_hash=p_session_hash
    and revoked_at is null
    and expires_at > now();

  if not found then
    return false;
  end if;

  if not exists (
    select 1
    from auth.users u
    join auth.sessions s
      on s.id=v_session.source_session_id
     and s.user_id=u.id
    join public.profiles p
      on p.id=u.id and p.is_active is true
    join public.app_users a
      on lower(a.email)=lower(u.email) and a.is_active is true
    where u.id=v_session.user_id
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= statement_timestamp())
      and (s.not_after is null or s.not_after > statement_timestamp())
      and exists (
        select 1
        from public.app_pages pg
        where pg.page_name='Ops_Board'
          and pg.appsmith_page='Operations'
          and pg.is_active is true
      )
      and (
        a.is_admin is true
        or exists (
          select 1
          from public.user_page_access x
          where lower(x.user_email)=lower(u.email)
            and x.page_name='Ops_Board'
            and x.can_view is true
        )
      )
  ) then
    update urisa_auth.erp_sessions
       set revoked_at=coalesce(revoked_at,now())
     where id=v_session.id;
    return false;
  end if;

  update urisa_auth.erp_sessions
     set last_seen_at=now()
   where id=v_session.id;

  return true;
end;
$function$;

revoke all on function public.erp_validate_session(text) from public, anon, authenticated;
grant execute on function public.erp_validate_session(text) to service_role;

create or replace function public.erp_revoke_session(
  p_session_hash text
) returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, urisa_auth, pg_temp
as $function$
begin
  update urisa_auth.erp_sessions
     set revoked_at=coalesce(revoked_at,now())
   where session_hash=p_session_hash;
  return found;
end;
$function$;

revoke all on function public.erp_revoke_session(text) from public, anon, authenticated;
grant execute on function public.erp_revoke_session(text) to service_role;

commit;

-- Planned rollback after removing Nginx references:
-- drop function if exists public.erp_revoke_session(text);
-- drop function if exists public.erp_validate_session(text);
-- drop function if exists public.erp_exchange_login_code(text,text,text);
-- drop function if exists public.erp_issue_login_code(text,text);
-- drop schema if exists urisa_auth cascade;
