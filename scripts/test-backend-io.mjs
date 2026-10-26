import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const compile=p=>ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace('import "server-only";','');
const http=url(compile('src/lib/server/http.ts'));
const db=url(`export function database(){return {query:async(sql,params)=>{globalThis.__mediaCalls.push({sql,params});return {rows:params[0]==='00000000-0000-0000-0000-000000000000'?[]:[{mime_type:'image/png',length:123,bytes:params[1]?null:Buffer.alloc(123)}]}}}}`);
const media=await import(url(compile('src/app/api/media/[id]/route.ts').replace('"@/lib/server/db"',JSON.stringify(db)).replace('"@/lib/server/http"',JSON.stringify(http))));
globalThis.__mediaCalls=[];
const id='11111111-1111-1111-1111-111111111111',context={params:Promise.resolve({id})};
const get=await media.GET(new Request('https://test.example/api/media/'+id),context);assert.equal((await get.arrayBuffer()).byteLength,123);assert.equal(globalThis.__mediaCalls.at(-1).params[1],false);
const head=await media.HEAD(new Request('https://test.example/api/media/'+id,{method:'HEAD'}),context);assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),'123');assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(globalThis.__mediaCalls.at(-1).params[1],true);
for(const etag of [`"${id}"`,`W/"${id}"`,`"different", "${id}"`,'*']){
 const r=await media.GET(new Request('https://test.example/api/media/'+id,{headers:{'If-None-Match':etag}}),context);assert.equal(r.status,304);assert.equal(globalThis.__mediaCalls.at(-1).params[1],true);assert.equal((await r.arrayBuffer()).byteLength,0);
}
assert.equal((await media.GET(new Request('https://test.example'),{params:Promise.resolve({id:'00000000-0000-0000-0000-000000000000'})})).status,404);
delete globalThis.__mediaCalls;

const state=globalThis.__exportConcurrency={active:0,max:0,total:701,calls:0,fail:false};
const partner=url(`export async function partnerRequest(path){const s=globalThis.__exportConcurrency;s.calls++;s.active++;s.max=Math.max(s.max,s.active);const p=Number(new URL('https://test.example'+path).searchParams.get('page'));await new Promise(r=>setTimeout(r,p%2?15:2));s.active--;if(s.fail&&p===3)return new Response('',{status:503});return Response.json({total:s.total,registrations:Array.from({length:Math.min(100,Math.max(0,s.total-(p-1)*100))},(_,i)=>({id:(p-1)*100+i+1,competition:'QA',members:[]}))});}`);
const {allCompetitionRegistrations}=await import(url(compile('src/lib/server/competition-export.ts').replace('"./partner"',JSON.stringify(partner))));
const rows=await allCompetitionRegistrations('QA');assert.equal(rows.length,701);assert.equal(state.calls,8);assert.equal(state.max,3);assert.equal(state.active,0);assert.deepEqual(rows.map(r=>r.id),Array.from({length:701},(_,i)=>i+1));
state.fail=true;await assert.rejects(()=>allCompetitionRegistrations('QA'));assert.equal(state.active,0,'All parallel GETs settle before returning failure');
delete globalThis.__exportConcurrency;
console.log('Passed: blob-free HEAD/304 responses, ETag lists/weak matching, missing image checks, max-three concurrent export GETs, deterministic order, complete output, failure cleanup. Synthetic fixtures only.');
