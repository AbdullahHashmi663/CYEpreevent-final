import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/server/auth";
import { partnerRequest } from "@/lib/server/partner";
import { PARTNER_COMPETITIONS } from "@/lib/partner-competitions";
import "@/components/site/explore.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "CYE Competition Registrations", robots: {index:false,follow:false} };
interface Registration { id:number; registeredAt:string; competition:string; teamName:string|null; teamSize:number; level:string; fee:string; status:string; paymentStatus:string; paymentSlipUploaded:boolean; submittedVia:string; members:{name:string;email:string;phone:string;institution:string;gender:string;isTeamLead:boolean}[] }
export default async function Page({searchParams}:{searchParams:Promise<{competition?:string;page?:string}>}) {
  const admin=await currentAdmin();
  if (!admin || admin.must_change_password) redirect("/admin");
  const query=await searchParams;
  const id=query.competition && Object.hasOwn(PARTNER_COMPETITIONS,query.competition)?query.competition:"contest-1";
  const name=PARTNER_COMPETITIONS[id as keyof typeof PARTNER_COMPETITIONS];
  const page=Math.max(1,Math.min(10000,Number.parseInt(query.page||"1",10)||1));
  let data:{total:number;registrations:Registration[]}|null=null;
  try {const r=await partnerRequest(`/registrations?competition=${encodeURIComponent(name)}&page=${page}&pageSize=25`);if(r.ok)data=await r.json();}catch{}
  return <main className="container explore-page explore-section"><Link href="/admin" className="text-link">← Back to admin</Link><h1>CYE competition registrations</h1><p>Read-only status from the main CYE team. Payment review and approval are managed by CYE. Student IDs and payment slip images are not shared by this API. Entries made on the main CYE website may show only Bahria participants, even when the total team size is larger.</p><nav className="partner-form-links" aria-label="Filter registrations by competition">{Object.entries(PARTNER_COMPETITIONS).map(([key,value])=><Link key={key} href={`?competition=${key}`} aria-current={id===key?"page":undefined}>{value}</Link>)}</nav><h2>{name}</h2>
    {!data ? <p role="alert">The CYE registration service is temporarily unavailable. Refresh this page to try again.</p> : <><p>{data.total} registrations · Page {page}</p>{data.registrations.map(row=><article key={row.id} className="partner-admin-registration"><h3>#{row.id} · {row.teamName||"Individual entry"}</h3><p><strong>Status: {row.status}</strong> · Payment: {row.paymentStatus} · Slip: {row.paymentSlipUploaded?"Uploaded":"Not uploaded"}</p><p>{row.fee} · {row.teamSize} participant(s) · {row.level} · {new Date(row.registeredAt).toLocaleString("en-PK",{timeZone:"Asia/Karachi"})} PKT</p><p>Submitted via: {row.submittedVia}</p><ul>{row.members.map((member,i)=><li key={i}><strong>{member.name}{member.isTeamLead?" (Team lead)":""}</strong> · {member.institution}<br/>{member.email} · {member.phone}</li>)}</ul></article>)}{!data.registrations.length&&<p>No registrations found for this competition.</p>}<nav aria-label="Registration pages" className="partner-admin-pagination">{page>1&&<Link href={`?competition=${id}&page=${page-1}`}>← Previous</Link>}{page*25<data.total&&<Link href={`?competition=${id}&page=${page+1}`}>Next →</Link>}</nav></>}
  </main>;
}
