/** Align published programme with the organizer's poster; preserve fees and all applications.
 * node scripts/update-programme.mjs previews; --apply writes the reviewed changes.
 * A private content-only backup is saved under ignored test-results before changes.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
import ts from "typescript";
nextEnv.loadEnvConfig(process.cwd(), false, { info(){}, error(){} });
const source=readFileSync("src/lib/cms-seed.ts","utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {SEED_CONTENT}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const desired=SEED_CONTENT.filter(record=>["conferences","contests"].includes(record.kind));
const retiredIds=["contest-3","contest-5","contest-6","contest-7","contest-8"];
const url=new URL(process.env.DATABASE_URL);
const client=new pg.Client({host:url.hostname,port:6543,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl:{rejectUnauthorized:true,ca:readFileSync(process.env.DATABASE_CA_FILE,"utf8")},connectionTimeoutMillis:10000,statement_timeout:15000});
try{
 await client.connect();
 await client.query("begin");
 await client.query("set local lock_timeout='5s'");
 const before=(await client.query("select * from public.cye_content where kind in ('contests','conferences') order by id for update")).rows;
 const settings=(await client.query("select data from public.cye_site_settings where id=true")).rows[0].data;
 const applications=(await client.query("select id,payload,status,deleted_at from public.cye_applications order by id")).rows;
 const changes=[];
 for(const record of desired){
  const existing=before.find(row=>row.id===record.id);
  if(existing?.deleted_at)throw Error("A target event is archived; review before changing the programme.");
  if(existing&&existing.kind!==record.kind)throw Error("A target event ID has a different content type.");
  const updated=existing?{...existing.data,title:record.title,category:record.category,sort_order:record.sort_order,published:true,...(record.kind==="conferences"?{description:record.description}: {})}:{...record,date:settings.event_date,location:settings.venue};
  if(existing&&JSON.stringify(updated)===JSON.stringify(existing.data))continue;
  changes.push({id:record.id,kind:record.kind,data:updated,operation:existing?"update":"insert"});
 }
 for(const existing of before.filter(row=>retiredIds.includes(row.id)&&row.data.published))changes.push({id:existing.id,kind:existing.kind,data:{...existing.data,published:false},operation:"unpublish"});
 console.log(JSON.stringify(changes.map(change=>({id:change.id,title:change.data.title,section:change.data.category,operation:change.operation})),null,2));
 if(process.argv.includes("--apply")){
  mkdirSync("test-results",{recursive:true});
  writeFileSync(`test-results/programme-backup-${Date.now()}.json`,JSON.stringify(before,null,2));
  for(const change of changes){
   if(change.operation==="insert")await client.query("insert into public.cye_content(id,kind,data) values($1,$2,$3::jsonb)",[change.id,change.kind,JSON.stringify(change.data)]);
   else await client.query("update public.cye_content set data=$1::jsonb,updated_at=now() where id=$2",[JSON.stringify(change.data),change.id]);
  }
  const after=(await client.query("select id,payload,status,deleted_at from public.cye_applications order by id")).rows;
  if(JSON.stringify(applications)!==JSON.stringify(after))throw Error("Applications changed; rolling back the programme update.");
  for(const original of before){
   const current=(await client.query("select data from public.cye_content where id=$1",[original.id])).rows[0].data;
   for(const field of ["fee","payment_method","payment_account_name","payment_account_number","payment_instructions","speaker_ids","date","time","min_members","max_members"]){
    if(JSON.stringify(current[field])!==JSON.stringify(original.data[field]))throw Error("An existing registration setting changed; rolling back.");
   }
  }
  const published=(await client.query("select kind,count(*)::int as count from public.cye_content where deleted_at is null and data->>'published'='true' and kind in ('contests','conferences') group by kind")).rows;
  if(!published.some(row=>row.kind==="contests"&&row.count===6)||!published.some(row=>row.kind==="conferences"&&row.count===2))throw Error("Unexpected published lineup; rolling back for review.");
  await client.query("commit");console.log("Programme updated: six competitions, one Career Pro workshop, one Talk. Fees, payment settings, speakers and applications preserved.");
 }else{await client.query("rollback");console.log("Preview only; no changes written.");}
}catch(error){try{await client.query("rollback");}catch{}console.error(error.code?"Programme update failed; database changes rolled back.":error.message);process.exitCode=1;}
finally{await client.end();}
