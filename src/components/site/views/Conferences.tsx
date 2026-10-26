import Link from "next/link";
import { ArrowDown, ArrowUpRight, CalendarDays, Clock3, MapPin, Mic2 } from "lucide-react";
import type { PublicContent } from "@/lib/cms-types";
import { programmeGroups, requiresPayment } from "@/lib/programme";
import { ContentImage, PageIntro } from "../SiteShell";
import { RegistrationNotice } from "../RegistrationNotice";
import { SectionHeading, RegistrationLink, BottomBanner } from "./Shared";

export default function Conferences({ data }: { data: PublicContent }) {
  return <>
    <PageIntro eyebrow="01 / Workshop & talk" title="BIG IDEAS." accent="BIGGER POSSIBILITIES." description="One Career Pro workshop. One talk. Practical skills for your next chapter and fresh perspectives to move you forward." />
    <section className="container explore-section"><RegistrationNotice data={data} /><nav className="programme-jump-links" aria-label="Conference sections">{programmeGroups(data.conferences, "conferences").map(group => <a href={`#${group.slug}`} key={group.name}><span>{group.name === "Career Pro" ? "Workshop" : "Conversation"}</span><strong>{group.name}</strong><ArrowDown size={19} aria-hidden="true" /></a>)}</nav><div className="conference-list">{data.conferences.length ? programmeGroups(data.conferences, "conferences").map(group => <section className="programme-section" id={group.slug} key={group.name} aria-labelledby={`heading-${group.slug}`}><header className="programme-section-heading"><span className="eyebrow">{group.name === "Career Pro" ? "The workshop" : "The conversation"}</span><h2 id={`heading-${group.slug}`}>{group.name}</h2><p>{group.description}</p></header>{group.entries.map((conference, index) => {
      const speakers = data.speakers.filter(speaker => conference.speaker_ids.includes(speaker.id));
      return <article className={`conference-feature ${index % 2 ? "conference-feature-reverse" : ""}`} key={conference.id} id={conference.id}>
        <div className="conference-visual"><ContentImage src={conference.image_url || "/images/auditorium.webp"} alt={conference.title} /><span className="image-number">0{index + 1}</span><span className="image-tag">{conference.category || "Conference"}</span></div>
        <div className="conference-copy"><span className="eyebrow">{conference.subtitle || "A conversation worth having"}</span><h3><Link href={`/conferences/${encodeURIComponent(conference.id)}`}>{conference.title}</Link></h3><p>{conference.description}</p><div className="event-detail-lines">
          <span><CalendarDays size={17} aria-hidden="true" />{conference.date || data.settings.date_label}</span>
          <span><Clock3 size={17} aria-hidden="true" />{conference.time || "Schedule to be announced"}</span>
          <span><MapPin size={17} aria-hidden="true" />{conference.location || data.settings.venue}</span>
        </div><p className="session-registration-note">{requiresPayment(conference) ? conference.fee > 0 ? `Paid workshop · PKR ${conference.fee.toLocaleString()} per person · receipt required` : "Paid workshop · fee to be announced" : "Free Talk · registration required"}<br />One participant per registration.</p>{speakers.length > 0 && <div className="conference-speakers"><span className="eyebrow">In conversation with</span>{speakers.map(speaker => <a href={`#speaker-${speaker.id}`} key={speaker.id}>{speaker.title}<ArrowUpRight size={14} aria-hidden="true" /></a>)}</div>}<RegistrationLink data={data} entry={conference} kind="conference" /></div>
      </article>;
    })}{!group.entries.length && <p className="muted">Details will appear here when the organizers publish this session.</p>}</section>) : <div className="explore-empty"><Mic2 size={36} aria-hidden="true" /><h2>The next conversation is taking shape.</h2><p>Conference details will appear here when the organizing team publishes the program.</p></div>}</div></section>
    <section className="explore-dark-section"><div className="container"><SectionHeading number="02" eyebrow="The program" title="A day to open your mind." description="Explore the published conference schedule. Times and locations are managed by the organizing team." />
      <div className="schedule-list">{data.conferences.map((entry, index) => <a className="schedule-row" href={`#${entry.id}`} key={entry.id}><span className="schedule-index">0{index + 1}</span><span className="schedule-time">{entry.time || "To be announced"}</span><div><h3>{entry.title}</h3><p>{entry.category} · {entry.location || data.settings.venue}</p></div><ArrowUpRight size={27} aria-hidden="true" /></a>)}{data.conferences.length === 0 && <p className="muted">The program has not been announced yet.</p>}</div>
    </div></section>
    <section className="container explore-section"><SectionHeading number="03" eyebrow="The voices" title="Meet the speakers." />
      {data.speakers.length ? <div className="people-grid">{data.speakers.map(speaker => <article className="person-card" id={`speaker-${speaker.id}`} key={speaker.id}><div className="person-image"><ContentImage src={speaker.image_url} alt={speaker.title} /><span>{speaker.category || "Speaker"}</span></div><h3>{speaker.title}</h3>{(speaker.id === "kanwal-cheema" || speaker.title.trim().toLowerCase() === "kanwal cheema") && <p className="eyebrow">Expected guest</p>}<p className="person-role">{speaker.subtitle}</p>{speaker.description && <p className="person-bio">{speaker.description}</p>}</article>)}</div> : <div className="speaker-announcement"><span className="announcement-mark" aria-hidden="true">✳</span><div><span className="eyebrow">More perspectives ahead</span><h3>The speaker lineup is coming together.</h3><p>Confirmed speakers will appear here once the organizers publish their profiles.</p></div><Link className="button button-outline" href="/contact">Ask the team<ArrowUpRight size={18} aria-hidden="true" /></Link></div>}
    </section>
    <BottomBanner eyebrow="Keep exploring" title="YOUR NEXT CHALLENGE AWAITS." href="/competitions" label="Explore competitions" />
  </>;
}
