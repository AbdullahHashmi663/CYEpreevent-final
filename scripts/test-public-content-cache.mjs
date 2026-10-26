import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const url=s=>"data:text/javascript;base64,"+Buffer.from(s).toString('base64');
const compile=file=>ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace('import "server-only";','');
const types=url(compile('src/lib/cms-types.ts'));
const seed=url(compile('src/lib/cms-seed.ts'));
const state=globalThis.__cacheTest={calls:0,fail:false,title:'Published member',invalidations:[]};
const cacheUrl=url(`const entries=new Map();export const registrations=[];export function unstable_cache(fn,key,options){registrations.push({key,options});return async()=>{const id=key.join(':');if(entries.has(id))return entries.get(id);const result=await fn();entries.set(id,result);return result;};}export function revalidateTag(tag,profile){globalThis.__cacheTest.invalidations.push({tag,profile});entries.clear();}`);
const dbUrl=url(`export function database(){return {query:async(sql)=>{const s=globalThis.__cacheTest;s.calls++;if(s.fail)throw Error('Database unavailable');return {rows:[{settings:{event_name:'Test event'},content:[{id:'member',kind:'team',data:{title:s.title,speaker_ids:[],use_avatar:true,image_url:'/private-photo.png'},deleted_at:null}]}]};}};}`);
const contentUrl=url(compile('src/lib/server/content.ts').replace('"react"',JSON.stringify(url('export const cache=fn=>fn'))).replace('"next/cache"',JSON.stringify(cacheUrl)).replace('"@/lib/cms-types"',JSON.stringify(types)).replace('"@/lib/cms-seed"',JSON.stringify(seed)).replace('"./db"',JSON.stringify(dbUrl)));
const {getPublicContent,PUBLIC_CONTENT_TAG}=await import(contentUrl);
const cache=await import(cacheUrl);
const first=await getPublicContent();
assert.equal(first.databaseAvailable,true);assert.equal(first.team[0].image_url,'');assert.equal(state.calls,1);
await getPublicContent();assert.equal(state.calls,1,'Warm requests reuse public data');
state.title='Updated member';cache.revalidateTag(PUBLIC_CONTENT_TAG,{expire:0});
assert.equal((await getPublicContent()).team[0].title,'Updated member');assert.equal(state.calls,2);
cache.revalidateTag(PUBLIC_CONTENT_TAG,{expire:0});state.fail=true;
assert.equal((await getPublicContent()).databaseAvailable,false);
state.fail=false;assert.equal((await getPublicContent()).databaseAvailable,true,'Database fallback must not become the cached public content');
assert.equal(cache.registrations[0].options.revalidate,60);
for(const file of ['src/app/api/admin/content/route.ts','src/app/api/admin/content/[id]/route.ts','src/app/api/admin/settings/route.ts']){
 const s=readFileSync(file,'utf8');assert(s.includes('revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 })'),file);
}
const partner=readFileSync('src/app/api/competition-registrations/route.ts','utf8');assert(partner.includes('await getPartnerCatalogue()'));assert(!partner.includes('getBrowsePartnerCatalogue'));
const app=readFileSync('src/lib/server/applications.ts','utf8');assert(app.includes('for update'));assert(!app.includes('getPublicContent'));
console.log('Passed: tagged public cache, immediate invalidation, avatar privacy, fallback recovery, and fresh submission checks outside browse caches.');
delete globalThis.__cacheTest;
