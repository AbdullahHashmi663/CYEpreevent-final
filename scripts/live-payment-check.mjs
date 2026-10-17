/** Authorized production QA. Creates tagged fixtures, waits for browser QA,
 * checks live APIs, then restores settings and removes only its own records.
 * Never prints credentials or receipts. State is saved under ignored test-results/.
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { randomBytes, randomUUID, scryptSync, createHash } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd(), false, { info(){}, error(){} });
if(existsSync("test-results/live-payment-state.json")){
 console.error("A live QA run is already active. Wait for its verified cleanup before starting another.");
 process.exit(1);
}
const origin="https://cyepreevent-final.vercel.app";
const tag=`qa-live-payment-${Date.now()}`;
const adminId=randomUUID(), email=`${tag}@example.test`, password=randomBytes(24).toString("base64url");
const participantEmail=`${tag}-team@example.test`;
const ids=[], trackedEmails=[participantEmail,`${tag}-pdf@example.test`,`${tag}-invalid@example.test`];
const receiptImage=readFileSync("public/brand/cye-emblem.png");
const pdf=Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
const checksum=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const url=new URL(process.env.DATABASE_URL);
const client=new pg.Client({host:url.hostname,port:6543,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl:{rejectUnauthorized:true,ca:readFileSync(process.env.DATABASE_CA_FILE,"utf8")},connectionTimeoutMillis:10000,statement_timeout:15000});
let cookie="",originalSettings,temporarySettings,originalAdmins,originalContent,originalApplications,adminCreated=false,settingsTouched=false,passed=0;
function ensure(value,label){if(!value)throw Error(label);passed++;console.log(`PASS ${label}`);}
async function request(path,{method="GET",body,form,authenticated=true}={}){
 const r=await fetch(origin+path,{method,headers:{...(method!=="GET"?{Origin:origin}:{}),...(authenticated&&cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{})},body:form||(body?JSON.stringify(body):undefined),signal:AbortSignal.timeout(45000)});
 const session=r.headers.getSetCookie().find(v=>v.startsWith("cye_admin_session="));if(session&&authenticated)cookie=session.split(";")[0];
 return {status:r.status,headers:r.headers,data:(r.headers.get("content-type")||"").includes("application/json")?await r.json():Buffer.from(await r.arrayBuffer())};
}
async function status(path,options,expected,label){const r=await request(path,options);ensure(r.status===expected,`${label} (HTTP ${r.status})`);return r;}
function record(title,members){return{id:"",kind:"contests",title:`${tag} ${title}`,subtitle:"Temporary live test",description:"Disposable QA competition; no real payment.",image_url:"",category:"QA",date:"2099-10-01",time:"10:00",location:"QA",fee:500,payment_method:"JazzCash",payment_account_name:"QA account holder",payment_account_number:"00000000000",payment_instructions:"QA only. Do not transfer real money.",min_members:members,max_members:members,capacity:10,rules:"QA only",speaker_ids:[],featured:false,published:true,sort_order:99999,deleted_at:null};}
function body(entryId,address,extra={}){return{kind:"contest",entry_id:entryId,expected_fee:500,name:`${tag} API participant`,email:address,phone:"03000000000",university:"QA University",team_members:[],...extra};}
function multipart(payload,bytes=receiptImage,mime="image/png"){const f=new FormData();f.set("payload",JSON.stringify(payload));f.set("receipt",new Blob([bytes],{type:mime}),mime==="application/pdf"?"receipt.pdf":"receipt.png");return f;}
try{
 await client.connect();
 originalSettings=(await client.query("select data,updated_at from public.cye_site_settings where id=true")).rows[0];
 originalAdmins=(await client.query("select * from public.cye_admin_users order by id")).rows;
 originalContent=(await client.query("select * from public.cye_content order by id")).rows;
 originalApplications=(await client.query("select * from public.cye_applications order by id")).rows;
 const salt=randomBytes(16).toString("hex");
 await client.query("insert into public.cye_admin_users(id,email,password_hash,must_change_password) values($1,$2,$3,false)",[adminId,email,`scrypt:${salt}:${scryptSync(password,salt,64).toString("hex")}`]);adminCreated=true;
 await status("/api/admin/auth",{method:"POST",body:{email,password}},200,"Live admin sign-in");
 const team=(await status("/api/admin/content",{method:"POST",body:record("Team competition",2)},201,"Create paid team competition")).data.record;ids.push(team.id);
 const individual=(await status("/api/admin/content",{method:"POST",body:record("Individual competition",1)},201,"Create paid individual competition")).data.record;ids.push(individual.id);
 const workshopRecord={...record("Career Pro workshop",1),kind:"conferences",category:"Career Pro",min_members:3,max_members:5};
 const workshop=(await status("/api/admin/content",{method:"POST",body:workshopRecord},201,"Create paid Career Pro workshop")).data.record;ids.push(workshop.id);
 ensure(workshop.min_members===1&&workshop.max_members===1,"Workshop enforces one participant per registration");
 const talkRecord={...record("Talk",1),kind:"conferences",category:"Talk",fee:0};
 const talk=(await status("/api/admin/content",{method:"POST",body:talkRecord},201,"Create free Talk")).data.record;ids.push(talk.id);
 await status(`/api/admin/content/${talk.id}`,{method:"PATCH",body:{fee:100}},400,"Talk cannot become paid");
 await status(`/api/admin/content/${workshop.id}`,{method:"PATCH",body:{fee:0}},400,"Workshop cannot become free");
 temporarySettings={...originalSettings.data,event_date:"2099-10-01",registration_open:true};settingsTouched=true;
 await status("/api/admin/settings",{method:"PUT",body:temporarySettings},200,"Open registration temporarily for future QA entries");
 const workshopEmail=`${tag}-workshop@example.test`,talkEmail=`${tag}-talk@example.test`,invalidConference=`${tag}-invalid-conference@example.test`;
 trackedEmails.push(workshopEmail,talkEmail,invalidConference);
 const workshopBody=body(workshop.id,workshopEmail,{kind:"conference"});
 await status("/api/applications",{method:"POST",authenticated:false,body:workshopBody},400,"Paid workshop rejects missing receipt");
 await status("/api/applications",{method:"POST",authenticated:false,form:multipart({...workshopBody,expected_fee:1})},409,"Workshop rejects forged fee");
 await status("/api/applications",{method:"POST",authenticated:false,form:multipart({...workshopBody,email:invalidConference,team_members:[{name:"Extra person",email:`${tag}-extra@example.test`,phone:"03000000001",university:"QA"}]})},400,"Workshop rejects multiple participants");
 await status("/api/applications",{method:"POST",authenticated:false,form:multipart(workshopBody)},201,"Paid workshop saves receipt registration");
 const talkBody=body(talk.id,talkEmail,{kind:"conference"});
 await status("/api/applications",{method:"POST",authenticated:false,form:multipart({...talkBody,email:invalidConference})},400,"Free Talk rejects unnecessary receipts");
 await status("/api/applications",{method:"POST",authenticated:false,body:{...talkBody,email:invalidConference,team_members:[{name:"Extra person",email:`${tag}-extra@example.test`,phone:"03000000001",university:"QA"}]}},400,"Talk rejects multiple participants");
 await status("/api/applications",{method:"POST",authenticated:false,body:talkBody},201,"Free Talk saves registration without receipt");
 const sessionData=(await request("/api/admin/data")).data;
 const workshopApp=sessionData.applications.find(app=>app.email===workshopEmail),talkApp=sessionData.applications.find(app=>app.email===talkEmail);
 ensure(workshopApp.payment_amount===500&&workshopApp.status==="pending"&&workshopApp.team_members.length===0,"Workshop records individual fee and awaits approval");
 ensure(talkApp.payment_amount===0&&!talkApp.payment_receipt_url&&talkApp.status==="pending"&&talkApp.team_members.length===0,"Talk records mandatory free individual registration");
 await status(workshopApp.payment_receipt_url,{authenticated:false},401,"Workshop receipt remains private");
 const workshopReceipt=await status(workshopApp.payment_receipt_url,{},200,"Admin downloads workshop receipt");
 ensure(workshopReceipt.data.equals(receiptImage),"Workshop receipt bytes preserved");
 await status(`/api/admin/applications/${workshopApp.id}`,{method:"PATCH",body:{status:"approved"}},200,"Admin approves paid workshop registration");
 await status(`/api/admin/applications/${talkApp.id}`,{method:"PATCH",body:{status:"approved"}},200,"Admin approves free Talk registration");
 mkdirSync("test-results",{recursive:true});writeFileSync("test-results/live-payment-receipt.png",receiptImage);
 writeFileSync("test-results/live-payment-state.json",JSON.stringify({origin,tag,email,password,participantEmail,teamId:team.id,individualId:individual.id,registrationUrl:`${origin}/register?kind=contest&entry=${team.id}`},null,2));
 if(process.argv.includes("--api-only")){
  await status("/api/applications",{method:"POST",authenticated:false,form:multipart(body(team.id,participantEmail,{team_members:[{name:"QA team member",email:`${tag}-member@example.test`,phone:"03000000001",university:"QA University"}]}))},201,"Submit live two-person team with PNG receipt");
  const pending=(await request("/api/admin/data")).data.applications.find(a=>a.email===participantEmail);
  ensure(pending?.status==="pending","Team receipt registration starts pending");
  await status(`/api/admin/applications/${pending.id}`,{method:"PATCH",body:{status:"approved"}},200,"Approve live team registration");
 }else{
 console.log("READY_FOR_BROWSER: complete the team form, upload test-results/live-payment-receipt.png, approve it in the admin portal, then create test-results/live-payment-continue.");
 const deadline=Date.now()+900000;
 while(!existsSync("test-results/live-payment-continue")){
  if(Date.now()>deadline)throw Error("Browser QA timed out; cleaning up.");
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 unlinkSync("test-results/live-payment-continue");
 }
 let data=(await status("/api/admin/data",{},200,"Reload live dashboard")).data;
 const app=data.applications.find(a=>a.email===participantEmail);
 ensure(app&&app.status==="approved","Team registration approval persisted on the live website");
 ensure(app.team_members.length===1&&app.payment_amount===500,"One PKR 500 fee covers the complete two-person team");
 const receiptUrl=`/api/admin/receipts/${app.id}`;
 ensure(app.payment_receipt_url===receiptUrl,"Admin application has private receipt link");
 await status(receiptUrl,{authenticated:false},401,"Anonymous receipt download blocked");
 const receipt=await status(receiptUrl,{},200,"Admin receipt download");
 ensure(receipt.data.equals(receiptImage)&&receipt.headers.get("content-type")==="image/png","Uploaded receipt bytes preserved exactly");
 ensure(receipt.headers.get("cache-control").includes("no-store"),"Receipt is not publicly cached");
 await status("/api/applications",{method:"POST",authenticated:false,body:body(individual.id,trackedEmails[2])},400,"Missing receipt rejected");
 await status("/api/applications",{method:"POST",authenticated:false,form:multipart(body(individual.id,trackedEmails[2],{expected_fee:1}))},409,"Forged or outdated fee rejected");
 await status("/api/applications",{method:"POST",authenticated:false,form:multipart(body(individual.id,trackedEmails[2]),Buffer.from("<script>bad</script>"))},400,"Forged receipt rejected");
 await status("/api/applications",{method:"POST",authenticated:false,form:multipart(body(individual.id,trackedEmails[2]),Buffer.alloc(2097153))},413,"Oversized receipt rejected");
 const individualSubmission=await status("/api/applications",{method:"POST",authenticated:false,form:multipart(body(individual.id,trackedEmails[1]),pdf,"application/pdf")},201,"Live PDF receipt registration");
 data=(await request("/api/admin/data")).data;const individualApp=data.applications.find(a=>a.reference===individualSubmission.data.reference);
 ensure(individualApp&&individualApp.status==="pending","Receipt upload awaits manual approval");
 const pdfDownload=await status(individualApp.payment_receipt_url,{},200,"Admin downloads PDF receipt");ensure(pdfDownload.data.equals(pdf),"PDF receipt bytes preserved");
 await status(`/api/admin/applications/${individualApp.id}`,{method:"PATCH",body:{status:"approved"}},200,"Approve PDF application");
 await status(`/api/admin/applications/${app.id}`,{method:"PATCH",body:{status:"rejected",rejection_reason:"QA rejection"}},200,"Reject team application");
 await status(`/api/admin/applications/${app.id}`,{method:"PATCH",body:{status:"pending"}},200,"Return team to pending");
 await status(`/api/admin/applications/${app.id}`,{method:"PATCH",body:{status:"approved"}},200,"Reapprove team");
 await status(`/api/admin/applications/${app.id}`,{method:"PATCH",body:{deleted:true}},200,"Archive participant");
 await status(`/api/admin/applications/${app.id}`,{method:"PATCH",body:{restore:true}},200,"Restore participant and receipt");
 await status(`/api/admin/content/${team.id}`,{method:"PATCH",body:{fee:750}},200,"Admin updates competition fee");
 data=(await request("/api/admin/data")).data;ensure(data.applications.find(a=>a.id===app.id).payment_amount===500,"Historic team fee remains unchanged");
 const csv=await status("/api/admin/export",{},200,"Export live application CSV");ensure(csv.data.toString().includes(receiptUrl)&&csv.data.toString().includes("Fee at registration (PKR)"),"CSV includes payment fee and private receipt reference");
 ensure(data.audit.some(a=>a.action==="payment.receipt_viewed"&&a.target_id===app.id),"Receipt access is audited");
 console.log(`Live payment verification: ${passed} assertions passed.`);
}catch(error){console.error("Live payment test failed: "+(error instanceof Error&&!error.code?error.message:"Database or service failure"));process.exitCode=1;}
finally{
 try{
  if(cookie)await request("/api/admin/auth",{method:"DELETE"});
  await client.query("begin");
  if(settingsTouched){const restored=await client.query("update public.cye_site_settings set data=$1::jsonb,updated_at=$2 where id=true and data=$3::jsonb",[JSON.stringify(originalSettings.data),originalSettings.updated_at,JSON.stringify(temporarySettings)]);if(restored.rowCount!==1)throw Error("Settings changed concurrently; manual review needed.");}
  await client.query("delete from public.cye_applications where payload->>'email'=any($1::text[])",[trackedEmails]);
  await client.query("delete from public.cye_content where id=any($1::text[]) and data->>'title' like $2",[ids,`${tag}%`]);
  if(adminCreated){await client.query("delete from public.cye_admin_sessions where admin_id=$1",[adminId]);await client.query("delete from public.cye_admin_users where id=$1",[adminId]);}
  await client.query("delete from public.cye_audit where admin_email=$1",[email]);
  const buckets=[...trackedEmails.map(e=>createHash("sha256").update(`applications-email:site:${e}`).digest("hex")),createHash("sha256").update(`login-identity:site:${email}`).digest("hex")];
  await client.query("delete from public.cye_rate_limits where bucket=any($1::text[])",[buckets]);
  await client.query("commit");
  ensure(checksum((await client.query("select data,updated_at from public.cye_site_settings where id=true")).rows[0])===checksum(originalSettings),"Original live settings restored exactly");
  ensure(checksum((await client.query("select * from public.cye_admin_users order by id")).rows)===checksum(originalAdmins),"Real admin accounts and passwords unchanged");
  ensure(checksum((await client.query("select * from public.cye_content order by id")).rows)===checksum(originalContent),"Original competition content unchanged");
  ensure(checksum((await client.query("select * from public.cye_applications order by id")).rows)===checksum(originalApplications),"All temporary participants and receipts cleaned up");
  try{unlinkSync("test-results/live-payment-state.json");}catch{}
  console.log("CLEANUP VERIFIED");
 }catch{try{await client.query("rollback");}catch{}console.error("QA cleanup requires attention; preserve real organizer data.");process.exitCode=1;}
 await client.end();
}
