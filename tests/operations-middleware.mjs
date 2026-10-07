import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=ts.transpileModule(fs.readFileSync('middleware.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
 .replace(/import \{ createServerClient \} from '@supabase\/ssr';/, 'const createServerClient=()=>globalThis.client;')
 .replace(/import \{ NextResponse \} from 'next\/server';/, 'const NextResponse=globalThis.response;');
function reply(status=200,body=null){return {status,body,cookies:{getAll:()=>[],set:()=>{}}};}
globalThis.response={next:()=>reply(),json:(body,options)=>reply(options.status,body),redirect:()=>reply(307)};
const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function request(path){return {cookies:{getAll:()=>[],set:()=>{}},nextUrl:{pathname:path},url:'https://portal.urisacompresores.com'+path};}
globalThis.client={auth:{getUser:async()=>({data:{user:null}})}};
assert.equal((await mod.middleware(request('/api/pilot/operations/me'))).status,401);
assert.equal((await mod.middleware(request('/dashboard'))).status,307);
assert.equal((await mod.middleware(request('/login'))).status,200);
globalThis.client={auth:{getUser:async()=>({data:{user:{id:'verified'}}})}};
assert.equal((await mod.middleware(request('/api/pilot/operations/me'))).status,200);
console.log('PASS: pilot API returns 401; legacy dashboard/login behavior preserved; authenticated request reaches route. Mocked dependencies.');

