import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const uid='11111111-1111-4111-8111-111111111111';
const sid='22222222-2222-4222-8222-222222222222';
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,banned_until timestamptz);
CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,not_after timestamptz);
CREATE TABLE profiles(id uuid,is_active boolean);
CREATE TABLE app_users(email text,is_active boolean,is_admin boolean);
CREATE TABLE app_pages(page_name text,appsmith_page text,is_active boolean);
CREATE TABLE user_page_access(user_email text,page_name text,can_view boolean,can_edit boolean);
CREATE TABLE ops_members(email text,full_name text,area text,rol text,is_active boolean);
CREATE FUNCTION ops_viewer(p_email text) RETURNS TABLE(email text,full_name text,area text,rol text,is_director boolean)
LANGUAGE sql STABLE SET search_path=public AS $$
SELECT m.email,m.full_name,m.area,m.rol,(m.rol='DIRECCION' OR coalesce(u.is_admin,false))
FROM ops_members m LEFT JOIN app_users u ON lower(u.email)=lower(m.email)
WHERE lower(m.email)=lower(trim(p_email)) AND m.is_active $$;
INSERT INTO auth.users VALUES('${uid}','actor@example.test',now(),null);
INSERT INTO auth.sessions VALUES('${sid}','${uid}',null);
INSERT INTO profiles VALUES('${uid}',true);
INSERT INTO app_users VALUES('actor@example.test',true,false);
INSERT INTO app_pages VALUES('Ops_Board','Operations',true);
INSERT INTO user_page_access VALUES('actor@example.test','Ops_Board',true,false);
INSERT INTO ops_members VALUES('actor@example.test','Actor','COMERCIAL','RESPONSABLE',true);
`);
await db.exec(fs.readFileSync(new URL('../../proposals/pilot_operations_identity.sql',import.meta.url),'utf8'));
const normal={sub:uid,session_id:sid,exp:Math.floor(Date.now()/1000)+3600};
const cases=[
 ['valid reader','',normal,true],
 ['no claims','',{},false],
 ['expired jwt','',{...normal,exp:1},false],
 ['malformed session','',{...normal,session_id:'bad'},false],
 ['wrong session','',{...normal,session_id:uid},false],
 ['wrong user','',{...normal,sub:sid},false],
 ['revoked session','DELETE FROM auth.sessions',normal,false],
 ['expired session',"UPDATE auth.sessions SET not_after=now()-interval '1 second'",normal,false],
 ['inactive profile','UPDATE profiles SET is_active=false',normal,false],
 ['inactive app user','UPDATE app_users SET is_active=false',normal,false],
 ['unconfirmed user','UPDATE auth.users SET email_confirmed_at=null',normal,false],
 ['banned user',"UPDATE auth.users SET banned_until=now()+interval '1 hour'",normal,false],
 ['inactive page','UPDATE app_pages SET is_active=false',normal,false],
 ['missing view permission','UPDATE user_page_access SET can_view=false',normal,false],
 ['inactive membership','UPDATE ops_members SET is_active=false',normal,false],
 ['admin permitted','UPDATE app_users SET is_admin=true; DELETE FROM user_page_access',normal,true],
 ['client metadata ignored','',{...normal,email:'admin@example.test',user_metadata:{role:'admin'}},true],
 ['editable metadata cannot grant', 'DELETE FROM user_page_access',{...normal,user_metadata:{role:'admin'}},false]
];
for(const [name,mutation,claims,allowed] of cases) {
 await db.exec('BEGIN');
 try {
  if(mutation)await db.exec(mutation);
  await db.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);
  await db.exec('SET LOCAL ROLE authenticated');
  let result,error;
  try{result=await db.query('SELECT public.pilot_operations_identity() AS actor');}catch(e){error=e;}
  if(allowed){assert.ifError(error);assert.equal(result.rows[0].actor.email,'actor@example.test');}
  else {assert.equal(error?.code,'42501',name);}
  console.log('PASS '+name);
 } finally {await db.exec('ROLLBACK');}
}
const acl=await db.query("SELECT has_function_privilege('anon','public.pilot_operations_identity()','EXECUTE') AS anon, has_function_privilege('authenticated','public.pilot_operations_identity()','EXECUTE') AS authenticated");
assert.equal(acl.rows[0].anon,false);assert.equal(acl.rows[0].authenticated,true);
console.log('PASS function ACL. Local synthetic Postgres only; Supabase integration and real logout pending.');
await db.close();

