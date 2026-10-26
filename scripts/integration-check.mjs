import { clearRateLimitBuckets, closeRateLimitFixtures } from "./rate-limit-fixtures.mjs";
/**
 * Repeatable live integration verification: node scripts/integration-check.mjs
 * Requires the app running locally (default http://localhost:3000), DATABASE_URL,
 * and optional DATABASE_CA_FILE in ignored .env.local. Set CYE_TEST_ORIGIN to
 * choose another local port. Run while no organizer is editing site settings.
 * Creates an isolated, random-password QA account and tagged fixtures; temporarily
 * changes registration settings; restores the original settings exactly and
 * removes only this run's fixtures in finally. Real admin passwords are untouched.
 * Never prints credentials, connection strings, participant data, or CSV contents.
 * TLS certificate verification is always enabled.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root, false, { info() {}, error() {} });
const origin = process.env.CYE_TEST_ORIGIN || "http://localhost:3000";
const target = new URL(origin);
if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) {
  console.error("Integration checks are restricted to a local app origin.");
  process.exit(1);
}
const tag = `qa-integration-${Date.now()}-${randomBytes(4).toString("hex")}`;
const adminId = randomUUID();
const adminEmail = `${tag}@example.test`;
const password = randomBytes(24).toString("base64url");
const newPassword = randomBytes(24).toString("base64url");
const verificationCode = "472901";
const challengeId = randomUUID();
const trackedContent = [];
const trackedEmails = new Set([adminEmail]);
const trackedBuckets = new Set();
let cookie = "", client, originalSettings, bootstrapSnapshot, settingsTouched = false, fixturesCreated = false;
let passed = 0, cleanupSucceeded = false;
const checksum = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function ensure(condition, label) { if (!condition) throw new Error(label); passed++; console.log(`PASS ${label}`); }
function hashPassword(value) { const salt = randomBytes(16).toString("hex"); return `scrypt:${salt}:${scryptSync(value,salt,64).toString("hex")}`; }
function recordBucket(scope, identity) { const clientIdentity=process.env.TRUST_PROXY === "true" ? "unknown" : "site";trackedBuckets.add(createHash("sha256").update(`${scope}:${clientIdentity}:${identity}`).digest("hex")); }
async function request(path, { method = "GET", body, authenticated = true, customCookie, requestOrigin = origin, form, withReceipt = true } = {}) {
  if (path === "/api/admin/password" && body) body = { code: verificationCode, challenge_id: challengeId, ...body };
  if (path === "/api/applications" && body?.kind === "contest" && withReceipt && !form) {
    form = new FormData();
    form.set("payload", JSON.stringify({ expected_fee:100, ...body }));
    form.set("receipt",new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lK0AAAAASUVORK5CYII=","base64")],{type:"image/png"}),"receipt.png");
  }
  const headers = {};
  if (requestOrigin !== null && method !== "GET") headers.Origin = requestOrigin;
  const token = customCookie ?? (authenticated ? cookie : "");
  if (token) headers.Cookie = token;
  if (body !== undefined && !form) headers["Content-Type"] = "application/json";
  const result = await fetch(`${origin}${path}`, { method, headers, body: form || (body === undefined ? undefined : JSON.stringify(body)), signal: AbortSignal.timeout(60000) });
  const setCookies = result.headers.getSetCookie();
  const session = setCookies.find(value => value.startsWith("cye_admin_session="));
  if (session && authenticated && customCookie === undefined) cookie = session.split(";")[0];
  const contentType = result.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await result.json() : await result.text();
  return { status: result.status, data, headers: result.headers, setCookie: session };
}
async function status(path, options, expected, label) {
  const result = await request(path, options);
  ensure(result.status === expected, `${label} (HTTP ${expected}; actual ${result.status})`);
  return result;
}
function blank(kind, extra = {}) {
  return { id: "", kind, title: `${tag} ${kind}`, subtitle: "QA fixture", description: "Integration test fixture", image_url: "", category: "QA", date: "2099-10-01", time: "10:00", location: "QA venue", fee: kind === "contests" ? 100 : 0, min_members: 1, max_members: 1, capacity: 0, rules: "QA rules", speaker_ids: [], featured: false, published: false, sort_order: 99999, deleted_at: null, ...extra };
}
async function addContent(kind, extra = {}) {
  const result = await status("/api/admin/content", { method: "POST", body: blank(kind,extra) }, 201, `${kind} content creation`);
  trackedContent.push(result.data.record.id);
  return result.data.record;
}
function application(entry, suffix, extra = {}) {
  const email = `${tag}-${suffix}@example.test`;
  trackedEmails.add(email);
  recordBucket("applications-email", email);
  return { kind: entry?.kind === "conferences" ? "conference" : "contest", entry_id: entry?.id, name: `${tag} participant`, email, phone: "+920000000000", university: "QA University", team_members: [], ...extra };
}
async function submit(entry, suffix, extra = {}, expected = 201, label = "Public application saved") {
  const body = application(entry,suffix,extra);
  const result = await status("/api/applications", { method: "POST", authenticated: false, body }, expected, label);
  return { result, body };
}
async function applicationId(reference) {
  const result = await client.query("select id from public.cye_applications where reference=$1 and payload->>'email'=any($2::text[])", [reference,[...trackedEmails]]);
  ensure(result.rowCount === 1, "Application persisted in PostgreSQL");
  return result.rows[0].id;
}

try {
  if (!process.env.DATABASE_URL) throw new Error("Private database configuration is missing.");
  const url = new URL(process.env.DATABASE_URL);
  const ca = process.env.DATABASE_CA_FILE ? readFileSync(process.env.DATABASE_CA_FILE,"utf8") : undefined;
  client = new pg.Client({ host: url.hostname, port: Number(url.port || 5432), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 10000, statement_timeout: 15000, query_timeout: 18000, application_name: "cye-integration-check" });
  await client.connect();
  originalSettings = (await client.query("select data,updated_at from public.cye_site_settings where id=true")).rows[0];
  bootstrapSnapshot = (await client.query("select id,email,password_hash,must_change_password,active from public.cye_admin_users order by id")).rows;
  if (!originalSettings) throw new Error("Database setup is incomplete.");
  await client.query("insert into public.cye_admin_users(id,email,password_hash,must_change_password) values($1,$2,$3,true)", [adminId,adminEmail,hashPassword(password)]);
  fixturesCreated = true;
  recordBucket("login-identity",adminEmail);
  recordBucket("password-change",adminId);
  recordBucket("password-code",adminId);
  console.log("Integration fixtures created; credentials remain private.");

  await status("/api/admin/data", { authenticated: false }, 401, "Admin data requires authentication");
  await status("/api/admin/export", { authenticated: false }, 401, "CSV requires authentication");
  await status("/api/admin/content", { method: "POST", authenticated: false, body: blank("team") }, 401, "Content mutation requires authentication");
  await status("/api/admin/auth", { method: "POST", body: { email: adminEmail,password }, requestOrigin: "https://untrusted.example" }, 403, "Cross-origin sign-in rejected");
  await status("/api/applications", { method: "POST", authenticated: false, requestOrigin: null, body: {} }, 403, "Missing mutation origin rejected");
  await status("/api/admin/auth", { method: "POST", body: { email: adminEmail,password: "wrong-qa-password" } }, 401, "Incorrect admin password rejected");
  const signedIn = await status("/api/admin/auth", { method: "POST", body: { email: adminEmail,password } }, 200, "QA admin sign-in");
  ensure(signedIn.data.user.must_change_password === true, "Temporary-password gate returned");
  ensure(/HttpOnly/i.test(signedIn.setCookie) && /SameSite=Strict/i.test(signedIn.setCookie), "Admin cookie has HTTP-only and same-site protection");
  await status("/api/admin/content", { method: "POST", body: blank("team") }, 428, "Temporary password blocks content writes");
  await status("/api/admin/settings", { method: "PUT", body: originalSettings.data }, 428, "Temporary password blocks settings writes");
  await status("/api/admin/export", {}, 428, "Temporary password blocks CSV export");
  await status("/api/admin/password", { method:"PATCH",body:{current_password:password,new_password:newPassword,code:"",challenge_id:""} },400,"Password change requires emailed code");
  await client.query("insert into public.cye_password_codes(admin_id,challenge_id,code_hash,password_hash_at_issue,expires_at) select id,$2,$3,password_hash,now()-interval '1 minute' from public.cye_admin_users where id=$1",[adminId,challengeId,hashPassword(verificationCode)]);
  await status("/api/admin/password", {method:"PATCH",body:{current_password:password,new_password:newPassword}},400,"Expired verification code rejected");
  await client.query("update public.cye_password_codes set expires_at=now()+interval '10 minutes' where admin_id=$1",[adminId]);
  await status("/api/admin/password", {method:"PATCH",body:{current_password:password,new_password:newPassword,challenge_id:randomUUID()}},400,"Superseded verification request rejected");
  for(let attempt=0;attempt<5;attempt++) await status("/api/admin/password",{method:"PATCH",body:{current_password:password,new_password:newPassword,code:"000000"}},400,`Incorrect email code rejected ${attempt+1}`);
  ensure((await client.query("select attempts from public.cye_password_codes where admin_id=$1",[adminId])).rows[0].attempts===5,"Wrong code attempts persist across requests");
  await clearRateLimitBuckets([createHash("sha256").update(`password-change:${process.env.TRUST_PROXY === "true" ? "unknown" : "site"}:${adminId}`).digest("hex")]);
  await status("/api/admin/password",{method:"PATCH",body:{current_password:password,new_password:newPassword}},400,"Correct code blocked after five wrong attempts");
  await client.query("update public.cye_password_codes set attempts=0 where admin_id=$1",[adminId]);
  await status("/api/admin/password", { method: "PATCH", body: { current_password: "wrong-qa-password", new_password: newPassword } }, 401, "Password change verifies current password");
  await status("/api/admin/password", { method: "PATCH", body: { current_password: password,new_password: "short" } }, 400, "Short replacement password rejected");
  const staleCookie = cookie;
  const changed = await status("/api/admin/password", { method: "PATCH", body: { current_password: password,new_password: newPassword } }, 200, "QA password changed");
  ensure(changed.data.user.must_change_password === false && cookie !== staleCookie, "Password change clears gate and rotates session");
  ensure((await client.query("select 1 from public.cye_password_codes where admin_id=$1",[adminId])).rowCount===0,"Used verification code removed atomically");
  await status("/api/admin/password",{method:"PATCH",body:{current_password:newPassword,new_password:password}},400,"Verification code cannot be reused");
  await status("/api/admin/data", { customCookie: staleCookie }, 401, "Old session invalidated after password rotation");
  await status("/api/admin/content", { method: "POST", body: blank("team"), requestOrigin: "https://untrusted.example" }, 403, "Authenticated cross-origin write rejected");
  await status("/api/admin/content", { method: "POST", body: blank("contests", { min_members:3,max_members:2 }) }, 400, "Invalid team-size range rejected");
  await status("/api/admin/content", { method: "POST", body: blank("team", { image_url: "javascript:alert(1)" }) }, 400, "Unsafe image URL rejected");
  await status("/api/applications", { method:"POST",authenticated:false,body:{message:"x".repeat(70000)} }, 413,"Oversized JSON body rejected");

  const settings = { ...originalSettings.data,event_date: "2099-10-01",date_label:"QA future event", registration_open:true };
  settingsTouched = true;
  await status("/api/admin/settings", { method: "PUT", body: settings }, 200, "Registration settings saved");
  ensure(checksum((await client.query("select data from public.cye_site_settings where id=true")).rows[0].data) === checksum(settings), "Settings persisted exactly");
  const speaker = await addContent("speakers");
  const conference = await addContent("conferences", { speaker_ids:[speaker.id], published:true, capacity:1 });
  const contest = await addContent("contests", { min_members:2,max_members:2,capacity:2,published:true });
  await status(`/api/admin/content/${contest.id}`,{method:"PATCH",body:{fee:0}},400,"Competition cannot be configured as free");
  await status(`/api/admin/content/${contest.id}`,{method:"PATCH",body:{payment_instructions:"QA wallet instructions",payment_method:"QA JazzCash",payment_account_name:"QA account",payment_account_number:"00000000000"}},200,"Competition wallet details and payment instructions saved");
  const team = await addContent("team", { image_url:"/images/members/WhatsApp Image 2026-08-24 at 12.10.44 PM (1).jpeg" });
  const sponsor = await addContent("sponsors");
  for (const record of [speaker, conference, contest, team, sponsor]) {
    await status(`/api/admin/content/${record.id}`, { method:"PATCH",body:{description:"QA updated description",featured:true,sort_order:99998} },200,`${record.kind} edit and feature`);
    await status(`/api/admin/content/${record.id}`, { method:"PATCH",body:{published:false} },200,`${record.kind} save as draft`);
    await status(`/api/admin/content/${record.id}`, { method:"PATCH",body:{published:true} },200,`${record.kind} publish`);
  }
  await status(`/api/admin/content/${team.id}`,{method:"PATCH",body:{speaker_ids:[speaker.id]}},400,"Non-conference speaker assignment rejected");
  await status(`/api/admin/content/${conference.id}`,{method:"PATCH",body:{speaker_ids:[randomUUID()]}},400,"Missing speaker assignment rejected");
  await status(`/api/admin/content/${contest.id}`, { method:"PATCH",body:{ subtitle:"QA edited subtitle" } }, 200, "Partial content edit saved");
  const persisted = (await client.query("select data from public.cye_content where id=$1",[contest.id])).rows[0].data;
  ensure(persisted.subtitle === "QA edited subtitle" && persisted.min_members === 2, "Content update persisted with team limits");
  const publicConference = await request("/conferences", { authenticated:false });
  ensure(publicConference.status === 200 && publicConference.data.includes(conference.title), "Published database content appears on website");

  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lK0AAAAASUVORK5CYII=","base64");
  const imageForm = new FormData(); imageForm.append("file",new Blob([image],{type:"image/png"}),"qa.png");
  const upload = await status("/api/admin/media", { method:"POST",form:imageForm }, 201, "Valid photo upload saved");
  const served = await fetch(`${origin}${upload.data.url}`);
  ensure(served.status === 200 && served.headers.get("content-type") === "image/png" && Buffer.from(await served.arrayBuffer()).equals(image), "Uploaded photo is served intact");
  ensure(served.headers.get("x-content-type-options") === "nosniff", "Public photo served with nosniff protection");
  await status(`/api/admin/content/${team.id}`,{method:"PATCH",body:{image_url:upload.data.url}},200,"Uploaded portrait assigned to team member");
  const invalidForm = new FormData();invalidForm.append("file",new Blob(["<script>bad</script>"],{type:"image/png"}),"invalid.png");
  await status("/api/admin/media", { method:"POST",form:invalidForm }, 400, "Forged image rejected");
  const hugeForm = new FormData();hugeForm.append("file",new Blob([Buffer.alloc(2097153)],{type:"image/png"}),"huge.png");
  await status("/api/admin/media", { method:"POST",form:hugeForm }, 413, "Oversized image rejected");
  const mismatchedForm = new FormData();mismatchedForm.append("file",new Blob([image],{type:"image/jpeg"}),"mismatch.jpg");
  await status("/api/admin/media", { method:"POST",form:mismatchedForm }, 400, "Mismatched image MIME type rejected");

  await submit(contest,"too-small",{},400,"Minimum contest team size enforced");
  const member = {name:"QA teammate",email:`${tag}-teammate@example.test`,phone:"+920000000000",university:"QA University"};
  await submit(contest,"too-large",{team_members:[member,{...member,email:`${tag}-second@example.test`}]},400,"Maximum contest team size enforced");
  const teamApplication = await submit(contest,"team",{team_members:[member]});
  ensure(teamApplication.result.data.status === "pending" && /^CYE-[A-F0-9]{10}$/.test(teamApplication.result.data.reference), "Submission returns stored pending reference");
  const teamId = await applicationId(teamApplication.result.data.reference);
  const paymentSnapshot=(await client.query("select payload from public.cye_applications where id=$1",[teamId])).rows[0].payload;
  ensure(paymentSnapshot.payment_amount===100,"Application stores authoritative competition price");
  const receiptUrl=`/api/admin/receipts/${teamId}`;
  await status(receiptUrl,{authenticated:false},401,"Payment receipt is private");
  const receiptDownload=await fetch(`${origin}${receiptUrl}`,{headers:{Cookie:cookie}});
  ensure(receiptDownload.status===200&&receiptDownload.headers.get("content-type")==="image/png"&&Buffer.from(await receiptDownload.arrayBuffer()).equals(image),"Admin downloads intact payment receipt");
  ensure(receiptDownload.headers.get("cache-control").includes("no-store")&&receiptDownload.headers.get("content-disposition").includes("attachment"),"Receipt download prevents caching and active inline content");
  await status(`/api/admin/content/${contest.id}`,{method:"PATCH",body:{fee:150}},200,"Admin can change competition fee");
  ensure((await client.query("select payload->>'payment_amount' amount from public.cye_applications where id=$1",[teamId])).rows[0].amount==="100","Historical payment amount survives price change");
  await status(`/api/admin/content/${contest.id}`,{method:"PATCH",body:{fee:100}},200,"Competition test fee restored");
  await status("/api/applications",{method:"POST",authenticated:false,withReceipt:false,body:application(contest,"no-receipt",{expected_fee:100})},400,"Competition requires receipt server-side");
  await status("/api/applications",{method:"POST",authenticated:false,body:application(contest,"stale-price",{expected_fee:1})},409,"Changed or forged fee rejected");
  const invalidReceipt=new FormData();invalidReceipt.set("payload",JSON.stringify(application(contest,"forged-receipt")));invalidReceipt.set("receipt",new Blob(["<script>bad</script>"],{type:"image/png"}),"forged.png");
  await status("/api/applications",{method:"POST",authenticated:false,form:invalidReceipt},400,"Forged payment receipt rejected");
  const oversizedReceipt=new FormData();oversizedReceipt.set("payload",JSON.stringify(application(contest,"large-receipt")));oversizedReceipt.set("receipt",new Blob([Buffer.alloc(2097153)],{type:"application/pdf"}),"large.pdf");
  await status("/api/applications",{method:"POST",authenticated:false,form:oversizedReceipt},413,"Oversized payment receipt rejected");
  const firstConference = await submit(conference,"conference-a");
  const conferenceId = await applicationId(firstConference.result.data.reference);
  await submit(conference,"conference-b",{},409,"Pending participants reserve conference capacity");
  await status(`/api/admin/applications/${conferenceId}`,{method:"PATCH",body:{status:"rejected",rejection_reason:""}},400,"Rejection requires a reason");
  await status(`/api/admin/applications/${conferenceId}`,{method:"PATCH",body:{status:"rejected",rejection_reason:"QA rejection reason"}},200,"Participant rejection saved");
  const replacement = await submit(conference,"conference-b");
  const replacementId = await applicationId(replacement.result.data.reference);
  await status(`/api/admin/applications/${conferenceId}`,{method:"PATCH",body:{status:"approved"}},409,"Approval cannot exceed participant capacity");
  await status(`/api/admin/applications/${replacementId}`,{method:"PATCH",body:{status:"approved"}},200,"Participant approval saved");
  await status(`/api/admin/applications/${replacementId}`,{method:"PATCH",body:{deleted:true}},200,"Participant moved to trash");
  ensure((await client.query("select deleted_at from public.cye_applications where id=$1",[replacementId])).rows[0].deleted_at !== null,"Participant soft deletion preserves row");
  await status(`/api/admin/applications/${replacementId}`,{method:"PATCH",body:{restore:true}},200,"Participant restored from trash");
  ensure((await client.query("select status,deleted_at from public.cye_applications where id=$1",[replacementId])).rows[0].status === "approved","Participant status survives restore");
  await status(`/api/admin/applications/${teamId}`,{method:"PATCH",body:{status:"approved"}},200,"Team approval saved");
  await status(`/api/admin/applications/${teamId}`,{method:"PATCH",body:{status:"pending"}},200,"Approved application returned to pending");
  await status(`/api/admin/applications/${teamId}`,{method:"PATCH",body:{status:"approved"}},200,"Pending application reapproved");
  for (const record of [team,sponsor,speaker,contest]) {
    await status(`/api/admin/content/${record.id}`,{method:"DELETE"},200,`${record.kind} archived`);
    await status(`/api/admin/content/${record.id}`,{method:"PATCH",body:{subtitle:"blocked edit"}},409,`${record.kind} cannot edit while archived`);
    await status(`/api/admin/content/${record.id}`,{method:"PATCH",body:{restore:true}},200,`${record.kind} restored`);
  }
  await status(`/api/admin/content/${conference.id}`,{method:"DELETE"},200,"Conference moved to trash");
  ensure((await client.query("select deleted_at from public.cye_content where id=$1",[conference.id])).rows[0].deleted_at !== null,"Content soft deletion preserves row");
  const archivedPublic = await request("/conferences",{authenticated:false});
  ensure(!archivedPublic.data.includes(conference.title),"Archived content disappears from public site");
  await status(`/api/admin/content/${conference.id}`,{method:"PATCH",body:{restore:true}},200,"Conference restored from trash");
  await status(`/api/admin/content/${conference.id}`,{method:"PATCH",body:{capacity:0}},200,"Conference capacity updated");
  await status("/api/applications",{method:"POST",authenticated:false,body:firstConference.body},409,"Duplicate registration rejected");
  await status(`/api/admin/content/${conference.id}`,{method:"PATCH",body:{published:false}},200,"Conference unpublished");
  await submit(conference,"unpublished",{},404,"Unpublished event rejects applications");
  await status(`/api/admin/content/${conference.id}`,{method:"PATCH",body:{published:true,date:"2000-01-01"}},200,"Past-date conference fixture saved");
  await submit(conference,"past-entry",{},409,"Past event date rejects applications");
  const concurrentEntry = await addContent("conferences",{published:true,capacity:1});
  const concurrentBodies = [application(concurrentEntry,"race-a"),application(concurrentEntry,"race-b")];
  const concurrent = await Promise.all(concurrentBodies.map(body=>request("/api/applications",{method:"POST",authenticated:false,body})));
  ensure(concurrent.map(result=>result.status).sort().join(",") === "201,409","Concurrent registrations cannot overbook capacity");
  ensure(Number((await client.query("select count(*) total from public.cye_applications where entry_id=$1",[concurrentEntry.id])).rows[0].total)===1,"Concurrent capacity permits only one stored participant");
  const bot = application(null,"honeypot",{kind:"contact",entry_id:undefined,message:"QA bot fixture",website:"https://bot.example"});
  await status("/api/applications",{method:"POST",authenticated:false,body:bot},400,"Application honeypot rejects automated spam");

  await status("/api/admin/settings",{method:"PUT",body:{...settings,registration_open:false}},200,"Registration closed");
  await submit(contest,"closed",{team_members:[member]},409,"Closed registration rejects contest applications");
  const contact = application(null,"contact",{kind:"contact",entry_id:undefined, name:"=1+1", message:"QA contact while registrations closed",team_members:[]});
  await status("/api/applications",{method:"POST",authenticated:false,body:contact},201,"Contact remains available when registration is closed");
  const limitedContact = application(null,"rate-limited",{kind:"contact",entry_id:undefined,message:"QA rate-limit fixture"});
  for(let attempt=0;attempt<5;attempt++) await status("/api/applications",{method:"POST",authenticated:false,body:limitedContact},201,`Contact rate allowance ${attempt+1}`);
  await status("/api/applications",{method:"POST",authenticated:false,body:limitedContact},429,"Persisted email rate limit enforced");
  const ambassador = application(null,"ambassador",{kind:"ambassador",entry_id:undefined,department:"QA Department",semester:"1",message:"QA motivation",team_members:[]});
  await status("/api/applications",{method:"POST",authenticated:false,body:ambassador},400,"Removed ambassador application type rejected when closed");
  await status("/api/admin/settings",{method:"PUT",body:{...settings,event_date:"2000-01-01"}},200,"Past global event fixture saved");
  await status("/api/applications",{method:"POST",authenticated:false,body:ambassador},400,"Removed ambassador application type rejected for past events");
  await status("/api/admin/settings",{method:"PUT",body:settings},200,"Registration reopened");
  await status("/api/applications",{method:"POST",authenticated:false,body:ambassador},400,"Removed ambassador application type rejected when open");
  const csv = await status("/api/admin/export",{},200,"Authenticated CSV export generated");
  ensure(csv.headers.get("content-type").includes("text/csv") && csv.data.includes('"\'=1+1"'),"CSV neutralizes spreadsheet formula injection");
  const adminData = await status("/api/admin/data",{},200,"Admin data refresh succeeds");
  const applicationPage = await status("/api/admin/applications",{},200,"Admin paginated application list succeeds");
  ensure(applicationPage.data.applications.some(row=>row.id===replacementId && row.status==="approved" && row.deleted_at===null),"Admin refresh shows persisted approval and restore");
  ensure(applicationPage.data.applications.some(row=>row.id===teamId&&row.payment_receipt_url===receiptUrl&&row.payment_amount===100),"Admin review exposes private receipt link and captured fee");
  ensure(adminData.data.applications.length<=5 && adminData.data.applicationSummary.total>=applicationPage.data.applications.length,"Workspace uses a bounded queue and independent totals");
  ensure(adminData.data.audit.some(row=>row.admin_email===adminEmail && row.action==="applications.exported"),"Admin audit records writes and exports");
  await status("/api/admin/auth",{method:"DELETE"},200,"Admin sign-out succeeds");
  await status("/api/admin/data",{},401,"Signed-out admin loses access");
  console.log(`Integration checks completed: ${passed} assertions passed.`);
} catch (error) {
  // Log only locally-authored assertion messages, never driver diagnostics or data.
  const message = error instanceof Error && !error.code && !error.cause ? error.message : "Connection or service failure; inspect private configuration and local server availability.";
  console.error(`Integration verification failed: ${message}`);
  process.exitCode = 1;
} finally {
  if (client && fixturesCreated) {
    try {
      await client.query("begin");
      if (settingsTouched && originalSettings) await client.query("update public.cye_site_settings set data=$1::jsonb,updated_at=$2 where id=true",[JSON.stringify(originalSettings.data),originalSettings.updated_at]);
      await client.query("delete from public.cye_applications where payload->>'email'=any($1::text[])",[[...trackedEmails]]);
      await client.query("delete from public.cye_content where id=any($1::text[]) or data->>'title' like $2",[trackedContent,`${tag} %`]);
      await client.query("delete from public.cye_media where admin_id=$1",[adminId]);
      await client.query("delete from public.cye_password_codes where admin_id=$1",[adminId]);
      await client.query("delete from public.cye_admin_sessions where admin_id=$1",[adminId]);
      await client.query("delete from public.cye_audit where admin_email=$1",[adminEmail]);
      await client.query("delete from public.cye_admin_users where id=$1 and email=$2",[adminId,adminEmail]);
      await clearRateLimitBuckets([...trackedBuckets]);
      await client.query("commit");
      const bootstrapAfter = (await client.query("select id,email,password_hash,must_change_password,active from public.cye_admin_users order by id")).rows;
      if (checksum(bootstrapAfter)!==checksum(bootstrapSnapshot)) throw new Error("Real administrator accounts changed unexpectedly.");
      const residue = await client.query("select (select count(*) from public.cye_admin_users where email=$1)::int admins,(select count(*) from public.cye_content where data->>'title' like $2)::int content,(select count(*) from public.cye_applications where payload->>'email'=any($3::text[]))::int applications,(select count(*) from public.cye_media where admin_id=$4)::int media",[adminEmail,`${tag} %`,[...trackedEmails],adminId]);
      if (Object.values(residue.rows[0]).some(value=>value!==0)) throw new Error("QA fixture cleanup was incomplete.");
      if (settingsTouched && checksum((await client.query("select data,updated_at from public.cye_site_settings where id=true")).rows[0])!==checksum(originalSettings)) throw new Error("Original settings were not fully restored.");
      cleanupSucceeded = true;
      console.log("Cleanup verified: QA fixtures removed, original settings restored, real bootstrap admin unchanged.");
    } catch {
      try { await client.query("rollback"); } catch {}
      console.error("Cleanup requires attention. Only this run's tagged QA fixtures may be removed; preserve all organizer records.");
      process.exitCode = 1;
    }
  }
  if (!fixturesCreated) { cleanupSucceeded = true; console.log("No QA fixtures were created; no database cleanup was needed."); }
  if (client) { try { await closeRateLimitFixtures(); await client.end(); } catch {} }
  if (!cleanupSucceeded) process.exitCode = 1;
}
