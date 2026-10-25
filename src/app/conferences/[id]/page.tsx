import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Clock3, MapPin, ArrowUpRight } from "lucide-react";
import SiteShell, { PageIntro, ContentImage } from "@/components/site/SiteShell";
import StructuredData from "@/components/site/StructuredData";
import { getPublicContent } from "@/lib/server/content";
import { pageMetadata } from "@/lib/seo";
import { sessionStructuredData } from "@/lib/event-seo";
import { requiresPayment } from "@/lib/programme";
import "@/components/site/explore.css";
export const revalidate = 60;
export async function generateStaticParams() {
  const data = await getPublicContent();
  return data.conferences.map(entry => ({ id: entry.id }));
}
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const data = await getPublicContent();
  const entry = data.conferences.find(item => item.id === id);
  if (!entry) return { title: "Session Not Found", robots: { index: false, follow: true } };
  return pageMetadata(entry.title + " at Bahria University Islamabad", (entry.subtitle || entry.description).slice(0, 155), "/conferences/" + encodeURIComponent(id));
}
export default async function SessionPage({ params }: Props) {
  const { id } = await params;
  const data = await getPublicContent();
  const entry = data.conferences.find(item => item.id === id);
  if (!entry) notFound();
  const speakers = data.speakers.filter(s => entry.speaker_ids.includes(s.id));
  const paid = requiresPayment(entry);
  const earlyBird = entry.id === "career-pro" && entry.fee > 0 && entry.fee < 500;
  return <SiteShell settings={data.settings}>
    <StructuredData data={sessionStructuredData(entry, data)} />
    <div className="explore-page session-detail">
      <nav className="container session-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/conferences">Workshops & Talks</Link><span aria-hidden="true">/</span><span aria-current="page">{entry.title}</span></nav>
      <PageIntro eyebrow={paid ? "Career workshop at BUIC" : "Talk at BUIC"} title={entry.title} description={entry.subtitle} />
      <section className="container explore-section conference-feature" aria-label="Session details">
        <div className="conference-visual"><ContentImage src={entry.image_url} alt={entry.title + " session poster"} priority /></div>
        <div className="conference-copy"><h2>About this {paid ? "workshop" : "talk"}</h2><p>{entry.description}</p>
          <div className="event-detail-lines"><span><CalendarDays size={18} aria-hidden="true" />{entry.date || data.settings.date_label}</span><span><Clock3 size={18} aria-hidden="true" />{entry.time || "Schedule to be announced"}</span><span><MapPin size={18} aria-hidden="true" />{entry.location || data.settings.venue}</span></div>
          <p className="programme-fee">{paid ? entry.fee > 0 ? <><strong>{earlyBird ? "Early bird" : "Workshop fee"}: Rs {entry.fee.toLocaleString("en-PK")} per person</strong>{earlyBird && <span>Regular price: <s>Rs 500</s> · Save Rs {500 - entry.fee}</span>}</> : "Workshop fee to be announced" : "Talk: Free"}</p>
          <p>Registration required. One participant per registration.{paid && " Payment receipt required."}</p>
          <Link className="button button-primary" href={"/register?kind=conference&entry=" + encodeURIComponent(entry.id)}>Registration details<ArrowUpRight size={18} aria-hidden="true" /></Link>
          <p><Link href="/venue">Venue & directions</Link> · <Link href="/contact">Ask the team</Link></p>
        </div>
      </section>
      {speakers.length > 0 && <section className="container explore-section"><h2>Meet the speakers</h2><p className="muted">Expected speakers are:</p><div className="people-grid">{speakers.map(speaker => <article className="person-card" key={speaker.id}><div className="person-image"><ContentImage src={speaker.image_url} alt={speaker.title} /></div><h3>{speaker.title}</h3><p className="person-role">{speaker.subtitle}</p>{speaker.description && <p className="person-bio">{speaker.description}</p>}</article>)}</div></section>}
    </div>
  </SiteShell>;
}
