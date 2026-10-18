/** Separate Al Nakhla and Bahria SSC without changing event or registration data.
 * Preview: node scripts/update-organizers.mjs; write: add --apply.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
import ts from "typescript";
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const compiled=ts.transpileModule(readFileSync("src/lib/cms-seed.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const { SEED_CONTENT }=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const ssc=SEED_CONTENT.find(record=>record.id==="bahria-ssc");
const url=new URL(process.env.DATABASE_URL);
const db=new pg.Client({host:url.hostname,port:6543,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl:{rejectUnauthorized:true,ca:readFileSync(process.env.DATABASE_CA_FILE,"utf8")},connectionTimeoutMillis:10000});
try{
 await db.connect();await db.query("begin");await db.query("set local lock_timeout='5s'");
 const partners=(await db.query("select * from public.cye_content where id in ('al-nakhla','bahria-ssc','youth-insight') order by id for update")).rows;
 const settings=(await db.query("select data,updated_at from public.cye_site_settings where id=true for update")).rows[0];
 if(!partners.some(row=>row.id==="al-nakhla"&&row.kind==="sponsors"&&!row.deleted_at))throw Error("Al Nakhla entry requires review.");
 if(partners.some(row=>row.id==="bahria-ssc"&&(row.kind!=="sponsors"||row.deleted_at)))throw Error("Existing SSC entry requires review.");
 const about=settings.data.about_description.replace(/Al Nakhla Student Support Centre/g,"Al Nakhla, the Student Support Centre at Bahria University Islamabad,");
 console.log("Separate Al Nakhla and SSC; add official SSC page logo; correct combined organizer wording.");
 if(!process.argv.includes("--apply")){await db.query("rollback");console.log("Preview only; no changes written.");}
 else{
  mkdirSync("test-results",{recursive:true});writeFileSync(`test-results/organizers-backup-${Date.now()}.json`,JSON.stringify({partners,settings},null,2));
  await db.query("update public.cye_content set data=jsonb_set(data,'{subtitle}','\"\"'::jsonb),updated_at=now() where id='al-nakhla' and data->>'subtitle'='Student Support Centre'");
  await db.query("insert into public.cye_content(id,kind,data) values($1,'sponsors',$2::jsonb) on conflict(id) do update set data=cye_content.data || jsonb_build_object('title',$3::text,'subtitle',$4::text,'image_url',$5::text),updated_at=now()",[ssc.id,JSON.stringify(ssc),ssc.title,ssc.subtitle,ssc.image_url]);
  await db.query("update public.cye_content set data=jsonb_set(data,'{sort_order}','2'::jsonb),updated_at=now() where id='youth-insight' and data->>'sort_order'='1'");
  if(about!==settings.data.about_description)await db.query("update public.cye_site_settings set data=jsonb_set(data,'{about_description}',$1::jsonb),updated_at=now() where id=true",[JSON.stringify(about)]);
  const after=(await db.query("select data from public.cye_site_settings where id=true")).rows[0].data;
  if(JSON.stringify({...settings.data,about_description:about})!==JSON.stringify(after))throw Error("An unrelated site setting changed; rolling back.");
  const verified=(await db.query("select id,data from public.cye_content where id in ('al-nakhla','bahria-ssc') order by id")).rows;
  if(verified.length!==2||verified.find(row=>row.id==="al-nakhla").data.subtitle==="Student Support Centre"||verified.find(row=>row.id==="bahria-ssc").data.image_url!==ssc.image_url)throw Error("Partner verification failed.");
  await db.query("commit");console.log("Live organizers corrected. Event settings, payments and registrations preserved.");
 }
}catch(error){try{await db.query("rollback");}catch{}console.error(error.code?"Organizer update failed; rolled back.":error.message);process.exitCode=1;}
finally{await db.end();}
