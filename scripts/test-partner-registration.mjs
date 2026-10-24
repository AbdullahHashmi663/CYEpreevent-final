/** Isolated contract tests. All upstream calls and rate-limit storage are mocked; no real entries or emails. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const compile = file => ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const validationUrl=moduleUrl(compile("src/lib/partner-competitions.ts"));
const { validatePartnerRegistration, PARTNER_COMPETITIONS }=await import(validationUrl);
assert.equal(Object.keys(PARTNER_COMPETITIONS).length,6);
const competition={localId:"contest-2",id:4,name:"Hackathon",fee:"PKR 2,000",teamMin:3,teamMax:5};
const member=i=>({name:`Test ${i}`,email:`test${i}@example.com`,phone:"03001234567",institution:"Bahria University Islamabad",gender:i%2?"Male":"Female"});
const valid={competition:"tampered name",teamName:"Test Team",level:"Undergraduate",idNumber:"TEST-ID",consent:true,members:[member(1),member(2),member(3)]};
assert.equal(validatePartnerRegistration(valid,competition).competition,"Hackathon");
for(const update of [{members:[member(1)]},{members:Array.from({length:6},(_,i)=>member(i))},{teamName:""},{consent:false},{level:"invalid"},{idNumber:""},{members:[member(1),member(1),member(3)]},{members:[{...member(1),gender:""},member(2),member(3)]},{members:[{...member(1),email:"bad"},member(2),member(3)]}])assert.throws(()=>validatePartnerRegistration({...valid,...update},competition));
const solo=validatePartnerRegistration({...valid,teamName:"",members:[member(1)]},{...competition,teamMin:1,teamMax:1});assert.equal(solo.teamName,"");
const httpUrl=moduleUrl(`export function fail(status,message){throw Object.assign(new Error(message),{status})} export function checkOrigin(r){if(r.headers.get('origin')!=='https://test.example')fail(403,'Wrong origin')} export async function readLimitedBody(r,max){const b=Buffer.from(await r.arrayBuffer());if(b.length>max)fail(413,'Too large');return b} export async function rateLimit(){} export function response(data,status=200){return Response.json(data,{status})} export async function handle(fn){try{return await fn()}catch(e){return response({error:e.message},e.status||503)}}`);
const speechCompetition={...competition,localId:"contest-4",name:"Speech (English / Urdu)",teamMin:1,teamMax:1};
const speechStorageUrl=moduleUrl(`export const storage={saved:[],finished:[],fail:false}; export async function recordSpeechLanguage(r){if(!r.speechLanguage)return null;if(storage.fail)throw Error("Database unavailable");storage.saved.push(r.speechLanguage);return "local-speech-id"} export async function finishSpeechLanguage(id,registrationId,rejected=false){if(id)storage.finished.push({id,registrationId,rejected})}`);
const {storage}=await import(speechStorageUrl);
const stubUrl=moduleUrl(`export const state={calls:0,closed:false,failNetwork:false,fee:'PKR 2,000'}; export async function getPartnerCatalogue(){return {registrationOpen:!state.closed,competitions:[${JSON.stringify(competition).replace('"PKR 2,000"','state.fee')},${JSON.stringify(speechCompetition).replace('"PKR 2,000"','state.fee')}]}} export async function partnerRequest(path,options){state.calls++;const body=options.body;const data=JSON.parse(body.get('registration'));if(!['Hackathon','Speech (English / Urdu)'].includes(data.competition)||data.members.length!==(data.competition==='Hackathon'?3:1)||'speechLanguage' in data||!body.get('paymentSlip'))throw Error('Bad upstream contract');if(state.failNetwork)throw Error('Timeout');return Response.json({id:123,status:'new',paymentStatus:'Not checked',paymentSlipUploaded:true},{status:201})}`);
let route=compile("src/app/api/competition-registrations/route.ts").replaceAll('"@/lib/server/partner"',JSON.stringify(stubUrl)).replaceAll('"@/lib/partner-competitions"',JSON.stringify(validationUrl)).replaceAll('"@/lib/server/http"',JSON.stringify(httpUrl)).replaceAll('"@/lib/server/speech-languages"',JSON.stringify(speechStorageUrl));
const {POST}=await import(moduleUrl(route));const {state}=await import(stubUrl);
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9N8AAAAASUVORK5CYII=","base64");
function request({origin="https://test.example",fee="PKR 2,000",id="contest-2",registration=valid,slip=png,includeSlip=true}={}){const form=new FormData();form.set("entry_id",id);form.set("expected_fee",fee);form.set("registration",JSON.stringify(registration));if(includeSlip)form.set("paymentSlip",new Blob([slip],{type:"image/png"}),"receipt.png");return new Request("https://test.example/api/competition-registrations",{method:"POST",headers:{Origin:origin},body:form});}
assert.equal((await POST(request({origin:"https://other.example"}))).status,403);
assert.equal((await POST(request({id:"unknown"}))).status,400);
assert.equal((await POST(request({fee:"PKR 1"}))).status,409);
assert.equal((await POST(request({includeSlip:false}))).status,422);
assert.equal((await POST(request({slip:Buffer.from("fake receipt")}))).status,415);
assert.equal((await POST(request({slip:Buffer.alloc(4194305)}))).status,413);
assert.equal((await POST(request({registration:{...valid,consent:false}}))).status,422);
state.closed=true;assert.equal((await POST(request())).status,403);state.closed=false;
assert.equal(state.calls,0);
const success=await POST(request());assert.equal(success.status,201);assert.equal((await success.json()).id,123);assert.equal(state.calls,1);
state.failNetwork=true;const unknown=await POST(request());assert.equal(unknown.status,503);assert.equal((await unknown.json()).uncertain,true);assert.equal(state.calls,2);
console.log("Passed: six-competition allowlist, team size, required fields, consent, duplicate emails, server-authoritative name/fee, origin checks, receipt validation, closed registration, upstream multipart contract, success reference, and uncertain-response handling. No live registrations created.");

// Language is required only for Speech and is saved locally before forwarding.
const speechValid={...valid,teamName:"",members:[member(1)]};
for(const speechLanguage of [undefined,"", "French", 123]) assert.throws(()=>validatePartnerRegistration({...speechValid,speechLanguage},speechCompetition));
assert.equal(validatePartnerRegistration({...valid,speechLanguage:"Urdu"},competition).speechLanguage,undefined);
state.failNetwork=false;
assert.equal((await POST(request({id:"contest-4",registration:speechValid}))).status,422);
for(const language of ["Urdu","English"]){const r=await POST(request({id:"contest-4",registration:{...speechValid,speechLanguage:language}}));assert.equal(r.status,201);assert.equal((await r.json()).speechLanguage,language);}
assert.deepEqual(storage.saved,["Urdu","English"]);
assert.equal(storage.finished.length,2);assert.equal(storage.finished[0].registrationId,123);
storage.fail=true;const calls=state.calls;assert.equal((await POST(request({id:"contest-4",registration:{...speechValid,speechLanguage:"Urdu"}}))).status,503);assert.equal(state.calls,calls);storage.fail=false;
state.failNetwork=true;assert.equal((await POST(request({id:"contest-4",registration:{...speechValid,speechLanguage:"English"}}))).status,503);assert.equal(storage.saved.length,3);assert.equal(storage.finished.length,2);
console.log("Passed: Urdu/English validation, language persistence, upstream payload compatibility, database failure prevents forwarding, and uncertain responses retain language selection.");
