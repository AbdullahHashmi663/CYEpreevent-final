import { clearRateLimitBuckets, seedRateLimitBucket, closeRateLimitFixtures } from "./rate-limit-fixtures.mjs";
/** Test only disposable QA accounts. Two real email requests verify provider
 * acceptance; known verification codes are then seeded for isolated API checks.
 * Real admins, passwords, sessions, settings and registrations are never modified.
 */
import { readFileSync } from "node:fs";
import { randomBytes, randomUUID, scryptSync, createHash } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const origin=process.env.CYE_ACCESS_TEST_ORIGIN||"http://localhost:3100";
if(!["http://localhost:3100","http://localhost:3101","https://cyepreevent-final.vercel.app"].includes(origin))throw Error("Unexpected test destination.");
if(process.argv.includes("--skip-email")&&!origin.startsWith("http://localhost:"))throw Error("Live checks must include email delivery.");
const tag=`qa-access-${Date.now()}`,id=randomUUID(),email=`${tag}@example.test`;
const password=randomBytes(24).toString("base64url"),replacement=randomBytes(24).toString("base64url");
const hash=value=>{const salt=randomBytes(16).toString("hex");return `scrypt:${salt}:${scryptSync(value,salt,64).toString("hex")}`;};
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const url=new URL(process.env.DATABASE_URL);
const db=new pg.Client({host:url.hostname,port:6543,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl:{rejectUnauthorized:true,ca:readFileSync(process.env.DATABASE_CA_FILE,"utf8")},connectionTimeoutMillis:10000});
let cookie="",checks=0,snapshot,created=false;
function ensure(value,label){if(!value)throw Error(label);checks++;console.log(`PASS ${label}`);}
async function request(path,body,{method="POST",session=cookie,requestOrigin=origin}={}){
 const response=await fetch(origin+path,{method,headers:{...(requestOrigin?{Origin:requestOrigin}:{}),...(session?{Cookie:session}:{}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
 return {status:response.status,data:await response.json(),cookie:response.headers.getSetCookie().find(value=>value.startsWith("cye_admin_session="))?.split(";")[0],headers:response.headers};
}
async function expect(path,body,status,label,options){const result=await request(path,body,options);ensure(result.status===status,`${label} (HTTP ${result.status})`);return result;}
const code=""+Math.floor(100000+Math.random()*900000);
async function seed(purpose,extra={}){
 const challenge=randomUUID();
 const account=(await db.query("select password_hash from public.cye_admin_users where id=$1",[id])).rows[0];
 await db.query("insert into public.cye_access_codes(admin_id,purpose,challenge_id,code_hash,password_hash_at_issue,expires_at,attempts) values($1,$2,$3,$4,$5,now()+interval '10 minutes',$6) on conflict(admin_id,purpose) do update set challenge_id=excluded.challenge_id,code_hash=excluded.code_hash,password_hash_at_issue=excluded.password_hash_at_issue,expires_at=excluded.expires_at,attempts=excluded.attempts",[id,purpose,challenge,hash(code),extra.passwordHash||account.password_hash,extra.attempts||0]);
 if(extra.expired)await db.query("update public.cye_access_codes set expires_at=now()-interval '1 minute' where admin_id=$1 and purpose=$2",[id,purpose]);
 return {email,purpose,challenge_id:challenge,code};
}
async function clearVerifyLimit(){await clearRateLimitBuckets([createHash("sha256").update(`access-verify-identity:site:${email}`).digest("hex")]);}
try{
 await db.connect();snapshot=(await db.query("select * from public.cye_admin_users order by id")).rows;
 await db.query("insert into public.cye_admin_users(id,email,password_hash,must_change_password) values($1,$2,$3,false)",[id,email,hash(password)]);created=true;
 const sent=process.argv.includes("--skip-email")
  ? (await seed("login"),{data:{message:"If this admin account exists, a six-digit code has been sent to the owner's verification email. It expires in 10 minutes. Check spam if needed."}})
  : await expect("/api/admin/access/code",{email,purpose:"login"},200,"Email provider accepts sign-in code request");
 const stored=(await db.query("select code_hash from public.cye_access_codes where admin_id=$1 and purpose='login'",[id])).rows[0];
 ensure(stored?.code_hash.startsWith("scrypt:")&&!sent.data.code,"Email code is hashed and never returned");
 const unknown=await expect("/api/admin/access/code",{email:`${tag}-unknown@example.test`,purpose:"login"},200,"Unknown account receives generic response");
 ensure(unknown.data.message===sent.data.message,"Responses do not disclose account existence");
 await expect("/api/admin/access/code",{email,purpose:"login"},403,"Cross-origin code request blocked",{requestOrigin:"https://example.invalid"});
 await expect("/api/admin/access/verify",{email,purpose:"login",code:"123",challenge_id:randomUUID()},400,"Malformed code rejected");
 let challenge=await seed("login");
 const wrongCode=code==="000000"?"111111":"000000";
 await expect("/api/admin/access/verify",{...challenge,code:wrongCode},400,"Incorrect code rejected");
 ensure((await db.query("select attempts from public.cye_access_codes where admin_id=$1 and purpose='login'",[id])).rows[0].attempts===1,"Wrong attempt persists after HTTP error");
 await expect("/api/admin/access/verify",{...challenge,purpose:"reset",new_password:replacement},400,"Sign-in code cannot reset a password");
 const signedIn=await expect("/api/admin/access/verify",challenge,200,"Email passkey signs in without password");cookie=signedIn.cookie;
 ensure(Boolean(cookie)&&signedIn.data.user?.id===id,"Email sign-in returns the correct admin session");
 ensure(signedIn.headers.get("cache-control")==="no-store","Sign-in response is not cached");
 await expect("/api/admin/data",undefined,200,"Email session opens protected dashboard",{method:"GET"});
 await expect("/api/admin/access/verify",challenge,400,"Consumed sign-in code cannot be replayed");
 challenge=await seed("login",{expired:true});await expect("/api/admin/access/verify",challenge,400,"Expired code rejected");
 challenge=await seed("login",{attempts:5});await expect("/api/admin/access/verify",challenge,400,"Five-attempt limit enforced");
 challenge=await seed("login",{passwordHash:hash("outdated-password")});await expect("/api/admin/access/verify",challenge,400,"Code issued before a password change rejected");
 await clearVerifyLimit();
 challenge=await seed("login");await db.query("update public.cye_admin_users set active=false where id=$1",[id]);
 await expect("/api/admin/access/verify",challenge,400,"Inactive admin cannot use email sign-in");
 await db.query("update public.cye_admin_users set active=true where id=$1",[id]);
 if(!process.argv.includes("--skip-email"))await expect("/api/admin/access/code",{email,purpose:"reset"},200,"Email provider accepts forgot-password reset code request");
 challenge=await seed("reset");
 await expect("/api/admin/access/verify",{...challenge,purpose:"login"},400,"Reset code cannot be used for sign-in");
 await expect("/api/admin/access/verify",{...challenge,new_password:"short"},400,"Short replacement password rejected");
 const reset=await expect("/api/admin/access/verify",{...challenge,new_password:replacement},200,"Forgot password resets QA account without current password");
 ensure(!reset.cookie&&!reset.data.user,"Password reset requires a fresh sign-in");
 await expect("/api/admin/data",undefined,401,"Password reset revokes previous session",{method:"GET"});
 await expect("/api/admin/access/verify",{...challenge,new_password:password},400,"Reset code cannot be replayed");
 ensure(!(await db.query("select 1 from public.cye_access_codes where admin_id=$1",[id])).rowCount,"Reset removes all outstanding access codes");
 await expect("/api/admin/auth",{email,password},401,"Old password no longer works");
 const newSession=await expect("/api/admin/auth",{email,password:replacement},200,"New password signs in");cookie=newSession.cookie;
 await expect("/api/admin/data",undefined,200,"New password session opens dashboard",{method:"GET"});
 const audits=(await db.query("select action from public.cye_audit where admin_email=$1",[email])).rows.map(row=>row.action);
 ensure(audits.includes("admin.email_sign_in")&&audits.includes("admin.password_reset"),"Email sign-in and reset are audited");
 await seedRateLimitBucket(createHash("sha256").update(`access-code-identity:site:${email}`).digest("hex"),3,900);
 await expect("/api/admin/access/code",{email,purpose:"reset"},429,"Code request rate limit enforced without sending extra email");
 console.log(`${checks} admin access checks passed.`);
}catch(error){console.error(error.code?"Access test failed: database/service error.":`Access test failed: ${error.message}`);process.exitCode=1;}
finally{
 try{
  await db.query("begin");
  if(created){await db.query("delete from public.cye_admin_sessions where admin_id=$1",[id]);await db.query("delete from public.cye_admin_users where id=$1",[id]);await db.query("delete from public.cye_audit where admin_email=$1",[email]);}
  const buckets=[];for(const address of [email,`${tag}-unknown@example.test`])for(const scope of ["access-code-identity","access-verify-identity","login-identity"])buckets.push(createHash("sha256").update(`${scope}:site:${address}`).digest("hex"));
  await clearRateLimitBuckets(buckets);await db.query("commit");
  ensure(digest((await db.query("select * from public.cye_admin_users order by id")).rows)===digest(snapshot),"All real admin accounts and passwords unchanged; QA fixtures removed");
 }catch{try{await db.query("rollback");}catch{}console.error("Access QA cleanup needs review.");process.exitCode=1;}
 await closeRateLimitFixtures();
 await db.end();
}
