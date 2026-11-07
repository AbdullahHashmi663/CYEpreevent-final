import EventQualificationNotice from "@/components/site/EventQualificationNotice";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PARTNER_COMPETITIONS, isCompetitionRegistrationClosed, type PartnerCatalogue } from "@/lib/partner-competitions";
import { getBrowsePartnerCatalogue } from "@/lib/server/partner";
import { getPublicContent } from "@/lib/server/content";
import CompetitionRegistration from "@/components/site/CompetitionRegistration";
import SiteShell, { PageIntro } from "@/components/site/SiteShell";
import "@/components/site/explore.css";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: {params: Promise<{id:string}>}): Promise<Metadata> {
  const {id}=await params;
  return pageMetadata(`${PARTNER_COMPETITIONS[id as keyof typeof PARTNER_COMPETITIONS] || "Competition"} Registration`, "Register your competition entry and submit payment details for organizer review.", `/competition-registration/${encodeURIComponent(id)}`, true);
}
export default async function Page({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if (!Object.hasOwn(PARTNER_COMPETITIONS,id)) notFound();
  const {settings}=await getPublicContent();
  const closed = isCompetitionRegistrationClosed(id);
  let catalogue: PartnerCatalogue | undefined;
  if (!closed) {
    try { catalogue = await getBrowsePartnerCatalogue(); }
    catch { /* Render a retry state without exposing upstream details. */ }
  }
  const competition=catalogue?.competitions.find(c=>c.localId===id);
  const competitionName = PARTNER_COMPETITIONS[id as keyof typeof PARTNER_COMPETITIONS];
  return <SiteShell settings={settings}>
    <div className="explore-page">
      <PageIntro
        eyebrow="Competition registration"
        title={closed ? competitionName : "YOUR CHALLENGE."}
        accent={closed ? "REGISTRATION CLOSED" : "YOUR TEAM."}
        description={closed ? "Registration for this competition has closed." : "A dedicated entry form and payment details for your chosen competition."}
      />
      <div className="container event-qualification-wrap"><EventQualificationNotice /></div>
      <section className="container explore-section">
        {closed ? <Link className="button button-outline" href="/competitions">Explore other competitions ↗</Link>
          : competition && catalogue ? <CompetitionRegistration competition={competition} catalogue={catalogue} />
          : <div className="explore-notice" role="status"><p>Registration details for this competition are temporarily unavailable. Please refresh this page or <Link href="/contact">contact the team</Link>. <Link href="/competitions">Back to competitions ↗</Link></p></div>}
      </section>
    </div>
  </SiteShell>;
}
