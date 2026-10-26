import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import nextEnv from '@next/env';
import pg from 'pg';
nextEnv.loadEnvConfig(process.cwd(), false, {info(){},error(){}});
const url = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const compile = path => ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace('import "server-only";','');
const db = url('export function database(){return globalThis.__backendDb}');
const http = url(compile('src/lib/server/http.ts'));
const helpers = url(`export function applicationRow(r){return {...r.payload,id:r.id,reference:r.reference,kind:r.kind,status:r.status,entry_title:r.entry_title||'',rejection_reason:r.rejection_reason,deleted_at:r.deleted_at?new Date(r.deleted_at).toISOString():null,created_at:new Date(r.created_at).toISOString()}}export const contentRow=r=>({...r.data,id:r.id,kind:r.kind,deleted_at:r.deleted_at});`);
const auth = url('export async function audit(){}');
const validation = url('export function text(){} export function validateContent(){} export function validateSettings(){}');
function module(path, replacements={}) {
  let s=compile(path);
  for(const [from,to] of Object.entries({'./db':db,'./content':helpers,'./http':http,'./auth':auth,'./validation':validation,...replacements})) s=s.replaceAll(JSON.stringify(from),JSON.stringify(to));
  return import(url(s));
}
const {applicationFilters,getAdminApplications}=await module('src/lib/server/admin-applications.ts');
for(const params of ['page=-1','page=1.5','page=100001','status=oops','kind=oops','q='+ 'x'.repeat(161)]) assert.throws(()=>applicationFilters(new URLSearchParams(params)));
const {getAdminData,transaction}=await module('src/lib/server/admin.ts');
const {applicationCsvStream}=await module('src/lib/server/application-export.ts');
let calls=0;
const config=new URL(process.env.DATABASE_URL);
const client=new pg.Client({host:config.hostname,port:Number(config.port||5432),user:decodeURIComponent(config.username),password:decodeURIComponent(config.password),database:decodeURIComponent(config.pathname.slice(1)),ssl:{rejectUnauthorized:true,...(process.env.DATABASE_CA_FILE?{ca:readFileSync(process.env.DATABASE_CA_FILE,'utf8')}:{})},connectionTimeoutMillis:10000,statement_timeout:15000,application_name:'cye-isolated-performance-tests'});
try {
  await client.connect();
  await client.query('begin');
  // Session-local fixtures only. Public participant/content tables are never modified.
  for(const name of ['cye_applications','cye_content','cye_site_settings','cye_audit']) await client.query(`create temp table ${name} (like public.${name} including defaults) on commit drop`);
  await client.query("insert into pg_temp.cye_site_settings(id,data) values(true,'{\"event_name\":\"QA\"}')");
  await client.query("insert into pg_temp.cye_content(id,kind,data) values('conference-qa','conferences','{\"title\":\"QA Workshop\",\"sort_order\":1}')");
  await client.query(`insert into pg_temp.cye_applications(id,reference,kind,entry_id,payload,status,deleted_at,created_at)
    select md5(g::text)::uuid,'QA-'||g,case when g%2=0 then 'conference' else 'contact' end,
      case when g%2=0 then 'conference-qa' else null end,
      jsonb_build_object('kind',case when g%2=0 then 'conference' else 'contact' end,'name','QA Person '||g,'email','qa-'||g||'@example.test','message',repeat('x',1000),'team_members','[]'::jsonb),
      case when g%3=0 then 'approved' else 'pending' end,case when g%10=0 then now() else null end,'2026-10-01T00:00:00Z'::timestamptz
    from generate_series(1,10000) g`);
  await client.query("update pg_temp.cye_applications set payload=jsonb_set(payload,'{name}','\"Literal %_\\\\ Name\"') where reference='QA-1'");
  await client.query(readFileSync('supabase/migrations/202610260001_backend_performance.sql','utf8').replaceAll('public.cye_applications','pg_temp.cye_applications').replace(/create index if not exists cye_sessions_admin_idx[^;]+;/,'').replaceAll('if not exists ',''));
  await client.query('analyze pg_temp.cye_applications');
  globalThis.__backendDb={query:async(sql,values)=>{calls++;return client.query(sql.replaceAll('public.','pg_temp.'),values)}};
  const data=await getAdminData({id:'qa',email:'qa@example.test',must_change_password:false});
  assert.equal(calls,1);assert.equal(data.applicationSummary.total,9000);assert.equal(data.applicationSummary.archived,1000);assert.equal(data.applicationSummary.approved,3000);assert.equal(data.applicationSummary.pending,6000);assert.equal(data.applications.length,5);
  const first=await getAdminApplications(new URLSearchParams());
  const second=await getAdminApplications(new URLSearchParams('page=2'));
  assert.equal(first.applications.length,20);assert.equal(first.total,9000);assert.equal(new Set([...first.applications,...second.applications].map(r=>r.id)).size,40,'Stable tie-breaker prevents page overlap');
  const last=await getAdminApplications(new URLSearchParams('page=450'));assert.equal(last.applications.length,20);
  const empty=await getAdminApplications(new URLSearchParams('page=451'));assert.equal(empty.total,9000);assert.equal(empty.applications.length,0);
  const archived=await getAdminApplications(new URLSearchParams('archived=true'));assert.equal(archived.total,1000);assert(archived.applications.every(r=>r.deleted_at));
  const filtered=await getAdminApplications(new URLSearchParams('kind=conference&status=approved'));assert.equal(filtered.total,1333);
  const escaped=await getAdminApplications(new URLSearchParams({q:'%_\\'}));assert.equal(escaped.total,1,'Search treats wildcard characters literally');
  const injection=await getAdminApplications(new URLSearchParams({q:"' or true --"}));assert.equal(injection.total,0);
  const old=await client.query("select a.*,c.data->>'title' entry_title from pg_temp.cye_applications a left join pg_temp.cye_content c on c.id=a.entry_id order by a.created_at desc limit 10000");
  const bytes={bulk:Buffer.byteLength(JSON.stringify(old.rows)),page:Buffer.byteLength(JSON.stringify(first)),workspace:Buffer.byteLength(JSON.stringify(data))};
  console.log('Passed: 10,000 isolated fixtures; one-query workspace, exact totals, bounded pages, stable tied dates, archive/filter/search, literal wildcards and SQL injection resistance. Bytes:',bytes);
  await client.query('rollback');
  // Verify cursor syntax/lifecycle against Postgres too, using only connection-local tables.
  await client.query('create temp table cye_applications (like public.cye_applications including defaults)');
  await client.query('create temp table cye_content (like public.cye_content including defaults)');
  await client.query(`insert into pg_temp.cye_applications(id,reference,kind,payload)
    select md5(g::text)::uuid,'CURSOR-'||g,'contact',jsonb_build_object('name','QA Cursor','email','qa@example.test','team_members','[]'::jsonb) from generate_series(1,1201) g`);
  let returned=false;
  globalThis.__backendDb={connect:async()=>({query:(sql,values)=>client.query(sql.replaceAll('public.','pg_temp.'),values),on:(...args)=>client.on(...args),removeListener:(...args)=>client.removeListener(...args),release:()=>{returned=true}})};
  const exported=await new Response(await applicationCsvStream()).text();
  assert(returned);assert.equal(exported.split('\r\n').length,1203);
  console.log('Passed: actual PostgreSQL read-only cursor exports all 1,201 temporary records across seven batches and returns its connection.');
} catch(error) {
  if(error?.code || !(error instanceof assert.AssertionError)) console.error('Backend SQL tests failed. Database diagnostics were suppressed.');
  else console.error(error.message);
  process.exitCode=1;
} finally {await client.query('rollback').catch(()=>{});await client.end().catch(()=>{});delete globalThis.__backendDb;}

// Cursor cleanup/backpressure tests need no live data or credentials.
let fetches=0,released=false,queries=[];
const fakeClient={on(){},removeListener(){},async query(sql){queries.push(sql);if(sql.startsWith('fetch')){fetches++;return {rows:fetches<=3?Array.from({length:200},(_,i)=>({id:`${fetches}-${i}`,reference:`QA-${fetches}-${i}`,kind:'contact',entry_title:'',status:'pending',rejection_reason:'',deleted_at:null,created_at:'2026-10-01T00:00:00Z',payload:{name:'=1+1',email:'qa@example.test',phone:'+923001234567',message:'"quoted", value\nnext',team_members:[]}})):[]}};return {rows:[]}},release(){released=true}};
globalThis.__backendDb={connect:async()=>fakeClient};
const stream=await applicationCsvStream();assert.equal(fetches,1);
const csv=await new Response(stream).text();assert.equal(fetches,4);assert(released);assert(queries.includes('commit'));assert(csv.includes("'=1+1"));assert(csv.includes("'+923001234567"));assert(csv.includes('""quoted""'));
fetches=0;released=false;queries=[];
const cancelled=await applicationCsvStream();await cancelled.cancel();assert(released);assert(queries.includes('rollback'));assert(!queries.includes('commit'));
delete globalThis.__backendDb;
console.log('Passed: batched CSV, consistent transaction, formula/quote escaping, successful release and rollback/release on download cancellation.');
const original=Error('Synthetic work failure');let destroyed;
globalThis.__backendDb={connect:async()=>({query:async sql=>{if(sql==='rollback')throw Error('Synthetic connection failure')},release:broken=>{destroyed=broken}})};
await assert.rejects(()=>transaction(async()=>{throw original}),error=>error===original);
assert.equal(destroyed,true);delete globalThis.__backendDb;
console.log('Passed: failed rollback preserves the original error and destroys the unusable connection.');
