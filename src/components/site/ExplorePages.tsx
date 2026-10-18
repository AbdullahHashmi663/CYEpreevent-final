"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, CalendarDays, Clock3, MapPin, Search, Users, Check, Mail, Phone, Sparkles, Code2, Lightbulb, Mic2, Palette, Plus, Minus } from "lucide-react";
import type { ContentRecord, PublicContent } from "@/lib/cms-types";
import { COMPETITION_SECTIONS, programmeGroups, programmeSection, requiresPayment } from "@/lib/programme";
import SiteShell, { ContentImage, PageIntro } from "./SiteShell";
import ApplicationForm, { RegistrationNotice, registrationsAvailable } from "./ApplicationForm";
import TeamMarquee from "./TeamMarquee";
import "./explore.css";

export type ExploreView = "conferences" | "competitions" | "team" | "ambassadors" | "venue" | "contact" | "register";
interface ExploreProps { data: PublicContent; view: ExploreView; defaultKind?: "contest" | "conference"; defaultEntry?: string }

function SectionHeading({ number, eyebrow, title, description }: { number: string; eyebrow: string; title: string; description?: string }) {
  return <div className="explore-section-heading"><div><span className="eyebrow"><span className="section-number">{number}</span> / {eyebrow}</span><h2>{title}</h2></div>{description && <p className="muted">{description}</p>}</div>;
}

function RegistrationLink({ data, entry, kind }: { data: PublicContent; entry: ContentRecord; kind: "contest" | "conference" }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const open = registrationsAvailable(data) && data.databaseAvailable && (!entry.date || entry.date >= today);
  return <Link href={`/register?kind=${kind}&entry=${encodeURIComponent(entry.id)}`} className={`button ${open ? "button-primary" : "button-outline"}`}>{open ? "Apply to join" : "Registration details"}<ArrowUpRight size={18} aria-hidden="true" /></Link>;
}

function Conferences({ data }: { data: PublicContent }) {
  return <>
    <PageIntro eyebrow="01 / Workshop & talk" title="BIG IDEAS." accent="BIGGER POSSIBILITIES." description="One Career Pro workshop. One talk. Practical skills for your next chapter and fresh perspectives to move you forward." />
    <section className="container explore-section"><RegistrationNotice data={data} /><nav className="programme-jump-links" aria-label="Conference sections">{programmeGroups(data.conferences, "conferences").map(group => <a href={`#${group.slug}`} key={group.name}><span>{group.name === "Career Pro" ? "Workshop" : "Conversation"}</span><strong>{group.name}</strong><ArrowDown size={19} aria-hidden="true" /></a>)}</nav><div className="conference-list">{data.conferences.length ? programmeGroups(data.conferences, "conferences").map(group => <section className="programme-section" id={group.slug} key={group.name} aria-labelledby={`heading-${group.slug}`}><header className="programme-section-heading"><span className="eyebrow">{group.name === "Career Pro" ? "The workshop" : "The conversation"}</span><h2 id={`heading-${group.slug}`}>{group.name}</h2><p>{group.description}</p></header>{group.entries.map((conference, index) => {
      const speakers = data.speakers.filter(speaker => conference.speaker_ids.includes(speaker.id));
      return <article className={`conference-feature ${index % 2 ? "conference-feature-reverse" : ""}`} key={conference.id} id={conference.id}>
        <div className="conference-visual"><ContentImage src={conference.image_url || "/images/auditorium.webp"} alt={conference.title} /><span className="image-number">0{index + 1}</span><span className="image-tag">{conference.category || "Conference"}</span></div>
        <div className="conference-copy"><span className="eyebrow">{conference.subtitle || "A conversation worth having"}</span><h3>{conference.title}</h3><p>{conference.description}</p><div className="event-detail-lines">
          <span><CalendarDays size={17} aria-hidden="true" />{conference.date || data.settings.date_label}</span>
          <span><Clock3 size={17} aria-hidden="true" />{conference.time || "Schedule to be announced"}</span>
          <span><MapPin size={17} aria-hidden="true" />{conference.location || data.settings.venue}</span>
        </div><p className="session-registration-note">{requiresPayment(conference) ? conference.fee > 0 ? `Paid workshop · PKR ${conference.fee.toLocaleString()} per person · receipt required` : "Paid workshop · fee to be announced" : "Free Talk · registration required"}<br />One participant per registration.</p>{speakers.length > 0 && <div className="conference-speakers"><span className="eyebrow">In conversation with</span>{speakers.map(speaker => <a href={`#speaker-${speaker.id}`} key={speaker.id}>{speaker.title}<ArrowUpRight size={14} aria-hidden="true" /></a>)}</div>}<RegistrationLink data={data} entry={conference} kind="conference" /></div>
      </article>;
    })}{!group.entries.length && <p className="muted">Details will appear here when the organizers publish this session.</p>}</section>) : <div className="explore-empty"><Mic2 size={36} aria-hidden="true" /><h2>The next conversation is taking shape.</h2><p>Conference details will appear here when the organizing team publishes the program.</p></div>}</div></section>
    <section className="explore-dark-section"><div className="container"><SectionHeading number="02" eyebrow="The program" title="A day to open your mind." description="Explore the published conference schedule. Times and locations are managed by the organizing team." />
      <div className="schedule-list">{data.conferences.map((entry, index) => <a className="schedule-row" href={`#${entry.id}`} key={entry.id}><span className="schedule-index">0{index + 1}</span><span className="schedule-time">{entry.time || "To be announced"}</span><div><h3>{entry.title}</h3><p>{entry.category} · {entry.location || data.settings.venue}</p></div><ArrowUpRight size={27} aria-hidden="true" /></a>)}{data.conferences.length === 0 && <p className="muted">The program has not been announced yet.</p>}</div>
    </div></section>
    <section className="container explore-section"><SectionHeading number="03" eyebrow="The voices" title="Meet the speakers." description="Fresh thinking starts with different perspectives." />
      {data.speakers.length ? <div className="people-grid">{data.speakers.map(speaker => <article className="person-card" id={`speaker-${speaker.id}`} key={speaker.id}><div className="person-image"><ContentImage src={speaker.image_url} alt={speaker.title} /><span>{speaker.category || "Speaker"}</span></div><h3>{speaker.title}</h3><p className="person-role">{speaker.subtitle}</p>{speaker.description && <p className="person-bio">{speaker.description}</p>}</article>)}</div> : <div className="speaker-announcement"><span className="announcement-mark" aria-hidden="true">✳</span><div><span className="eyebrow">More perspectives ahead</span><h3>The speaker lineup is coming together.</h3><p>Confirmed speakers will appear here once the organizers publish their profiles.</p></div><Link className="button button-outline" href="/contact">Ask the team<ArrowUpRight size={18} aria-hidden="true" /></Link></div>}
    </section>
    <BottomBanner eyebrow="Keep exploring" title="YOUR NEXT CHALLENGE AWAITS." href="/competitions" label="Explore competitions" />
  </>;
}

function ContestIcon({ category }: { category: string }) {
  const props = { size: 27, strokeWidth: 1.6, "aria-hidden": true as const };
  if (/tech/i.test(category)) return <Code2 {...props} />;
  if (/venture/i.test(category)) return <Lightbulb {...props} />;
  if (/spectrum|creative|art/i.test(category)) return <Palette {...props} />;
  return <Mic2 {...props} />;
}

function Competitions({ data }: { data: PublicContent }) {
  const [category, setCategory] = useState("All disciplines");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const groups = programmeGroups(data.contests, "contests");
  const categories = ["All disciplines", ...groups.filter(group => group.entries.length).map(group => group.name)];
  const filtered = data.contests.filter(entry => (category === "All disciplines" || programmeSection(entry) === category) && `${entry.title} ${programmeSection(entry)} ${entry.subtitle} ${entry.description}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <>
    <PageIntro eyebrow="02 / Four sections. Your next challenge." title="SHOW UP." accent="STAND OUT." description="Tech Nexus. Venture X. Spectrum. Literary. Find your people, choose your challenge, and bring your best." />
    <section className="container explore-section"><RegistrationNotice data={data} />
      <nav className="programme-jump-links competition-sections" aria-label="Competition sections">{COMPETITION_SECTIONS.map(section => <a href={`#${section.slug}`} key={section.name} onClick={() => { setCategory("All disciplines"); setQuery(""); }}><span className="programme-section-icon"><ContestIcon category={section.name} /></span><strong>{section.name}</strong><span>{section.events}</span><ArrowDown size={18} aria-hidden="true" /></a>)}</nav>
      <div className="contest-toolbar"><div className="filter-chips" role="group" aria-label="Filter competitions by discipline">{categories.map(item => <button key={item} aria-pressed={category === item} className={`filter-chip ${category === item ? "is-active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="competition-search"><Search size={18} aria-hidden="true" /><span className="visually-hidden">Search competitions</span><input type="search" placeholder="Find your competition" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      <div className="results-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "competition" : "competitions"}{category !== "All disciplines" ? ` in ${category}` : " to explore"}</div>
      {programmeGroups(filtered, "contests").filter(group => group.entries.length || (!query.trim() && category === "All disciplines")).map(group => <section className="programme-section" id={group.slug} key={group.name} aria-labelledby={`heading-${group.slug}`}><header className="programme-section-heading"><span className="eyebrow">{String(groups.findIndex(item => item.name === group.name) + 1).padStart(2, "0")} / Competition section</span><h2 id={`heading-${group.slug}`}>{group.name}</h2><p>{group.description}</p></header><div className="contest-grid">{group.entries.map((contest, index) => {
        const isExpanded = expanded.includes(contest.id);
        const max = Math.max(1, Math.min(20, contest.max_members));
        const min = Math.max(1, Math.min(max, contest.min_members || 1));
        return <article key={contest.id} className={`contest-card contest-color-${index % 4}`} id={contest.id}>
          <div className="contest-card-top"><span className="eyebrow">{group.name}</span><span className="contest-icon"><ContestIcon category={group.name} /></span></div>
          <h3>{contest.title}</h3><p className="contest-subtitle">{contest.subtitle}</p><p className="contest-description">{contest.description}</p>
          <div className="contest-meta"><span><Users size={15} aria-hidden="true" />{max === 1 ? "Individual" : min === max ? `${max} per team` : `${min}–${max} per team`}</span><span><Clock3 size={15} aria-hidden="true" />{contest.time || "Time TBA"}</span><span>{contest.fee > 0 ? `PKR ${contest.fee.toLocaleString()} per registration` : "Fee to be announced"}</span></div>
          <button className="contest-rules-toggle" type="button" aria-expanded={isExpanded} aria-controls={`rules-${contest.id}`} onClick={() => setExpanded(current => isExpanded ? current.filter(id => id !== contest.id) : [...current, contest.id])}>The rules & details{isExpanded ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}</button>
          <div id={`rules-${contest.id}`} hidden={!isExpanded} className="contest-rules">{contest.rules ? <ul>{contest.rules.split(/\n+/).filter(Boolean).map((rule, ruleIndex) => <li key={ruleIndex}>{rule}</li>)}</ul> : <p>The organizing team will publish detailed rules here. <Link href="/contact">Contact us</Link> for guidance.</p>}{contest.location && <p className="muted">Location: {contest.location}</p>}{contest.date && <p className="muted">Date: {contest.date}</p>}</div>
          <RegistrationLink data={data} entry={contest} kind="contest" />
        </article>;
      })}</div>{!group.entries.length && <p className="programme-coming-soon">This section’s competition details will be published soon.</p>}</section>)}
      {filtered.length === 0 && <div className="explore-empty"><Search size={32} aria-hidden="true" /><h2>No matches just yet.</h2><p>{data.contests.length ? "Try another search or explore all disciplines." : "The next competition lineup will appear here when it’s published."}</p>{data.contests.length > 0 && <button className="button button-outline" onClick={() => { setCategory("All disciplines"); setQuery(""); }}>Reset filters<ArrowUpRight size={17} aria-hidden="true" /></button>}</div>}
    </section>
    <section className="explore-dark-section"><div className="container"><SectionHeading number="03" eyebrow="From idea to arena" title="Your move. Three steps." /><div className="three-step-grid">{[["01", "Find your challenge.", "Explore the disciplines and read the rules. Choose the experience that fits your strengths."], ["02", "Make your application.", "When registration opens, enter your details and add your teammates where needed."], ["03", "Await your approval.", "The organizers review your application. Keep your reference handy when contacting the team."]].map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
    <BottomBanner eyebrow="Questions about your entry?" title="LET’S TALK IT THROUGH." href="/contact" label="Contact the team" />
  </>;
}

function Team({ data }: { data: PublicContent }) {
  return <>
    <PageIntro eyebrow="03 / The people behind the possibility" title="GOOD PEOPLE." accent="GREAT ENERGY." description="A collective of students, makers, and doers turning a shared vision into a day worth remembering." />
    <section className="container explore-section team-about-block"><div><span className="eyebrow">Built by youth. For youth.</span><h2>We believe the future<br />starts with connection.</h2></div><div><p>{data.settings.about_description}</p><Link href="/ambassadors" className="text-link">Be part of the movement<ArrowUpRight size={20} aria-hidden="true" /></Link></div></section>
    <section className="container explore-section team-section"><SectionHeading number="01" eyebrow="Meet the organizing team" title="The minds making it happen." />
      <div className="people-grid team-grid">{data.team.map((person, index) => <article className="person-card" key={person.id}><div className={`person-image person-tint-${index % 3}`}><ContentImage src={person.image_url} alt={person.title} /><span className="person-count">{String(index + 1).padStart(2, "0")}</span></div><h3>{person.title}</h3><p className="person-role">{person.subtitle}</p><p className="person-bio">{person.description}</p></article>)}</div>
      {!data.team.length && <div className="explore-empty"><Users size={36} aria-hidden="true" /><h3>Meet our people soon.</h3><p>The organizing team’s profiles will appear here when they’re published.</p></div>}
    </section>
    <TeamMarquee members={data.team} />
    {data.sponsors.length > 0 && <section className="explore-partners"><div className="container"><SectionHeading number="02" eyebrow="Stronger together" title="The people backing our purpose." /><div className="partner-grid">{data.sponsors.map(partner => <article key={partner.id}><ContentImage src={partner.image_url} alt={partner.title} /><div><h3>{partner.title}</h3><p>{partner.subtitle}</p></div></article>)}</div></div></section>}
    <BottomBanner eyebrow="A bigger circle" title="BRING YOUR CAMPUS WITH YOU." href="/ambassadors" label="Become an ambassador" />
  </>;
}

function Ambassadors({ data }: { data: PublicContent }) {
  return <>
    <PageIntro eyebrow="04 / Campus ambassadors" title="BE THE" accent="CONNECTION." description="Bring the energy of Capital Youth Expo to your campus. Rally your people. Build something bigger together." />
    <section className="container explore-section ambassador-story"><div className="ambassador-image"><ContentImage src="/images/cye-student-ambassador.jpg" alt="A student portrait representing the campus ambassador community" /><span className="ambassador-sticker">YOUR CAMPUS.<br />YOUR COMMUNITY.</span></div><div className="ambassador-copy"><span className="eyebrow">For the natural connectors</span><h2>A little initiative.<br />A lot of impact.</h2><p>Love bringing people together? Our campus ambassadors help students discover the expo, find their competition, and join the conversation.</p><p>You’ll work with the organizing team, share accurate event information, and be a helpful point of contact for your campus community.</p><a className="button button-primary" href="#ambassador-application">Make your introduction<ArrowDown size={18} aria-hidden="true" /></a></div></section>
    <section className="explore-dark-section"><div className="container"><SectionHeading number="01" eyebrow="What you’ll bring" title="Good energy goes a long way." /><div className="three-step-grid"><article><Sparkles size={29} aria-hidden="true" /><h3>Start the conversation.</h3><p>Share the published event details and help students discover experiences that suit them.</p></article><article><Users size={29} aria-hidden="true" /><h3>Bring people together.</h3><p>Connect interested students with the team, and help them understand the application process.</p></article><article><Check size={29} aria-hidden="true" /><h3>Keep it thoughtful.</h3><p>Represent your campus respectfully and coordinate your activities with the organizers.</p></article></div></div></section>
    <section id="ambassador-application" className="container explore-section form-layout"><div className="form-sidebar"><span className="eyebrow">02 / Join the circle</span><h2>Your campus<br />starts with you.</h2><p>We welcome students who care about their community and enjoy taking initiative. Tell us about your campus and why you’d like to get involved.</p><div className="form-sidebar-note"><span className="eyebrow">What happens next</span><p>Your application is saved for the organizing team to review. Keep your reference so you can follow up with us.</p></div></div><ApplicationForm data={data} mode="ambassador" /></section>
  </>;
}

function Venue({ data }: { data: PublicContent }) {
  return <>
    <PageIntro eyebrow="05 / The meeting point" title="SAME PLACE." accent="NEW PERSPECTIVES." description={`A gathering point for a generation of ideas. Find us at ${data.settings.venue}.`} />
    <section className="container explore-section venue-section"><div className="venue-wide-image"><ContentImage src="/images/auditorium.webp" alt="The auditorium at Bahria University Islamabad" /><div className="venue-image-caption"><span className="eyebrow">The stage is set</span><span>{data.settings.venue}</span></div></div><div className="venue-info-grid"><div><span className="eyebrow">The destination</span><h2>{data.settings.venue}</h2><p>{data.settings.venue_address}</p>{data.settings.maps_url && <a className="button button-primary" href={data.settings.maps_url} target="_blank" rel="noopener noreferrer">Get directions<ArrowUpRight size={19} aria-hidden="true" /></a>}</div><div className="venue-facts"><div><CalendarDays size={23} aria-hidden="true" /><span><small>Listed event date</small><strong>{data.settings.date_label || data.settings.event_date || "To be announced"}</strong></span></div><div><MapPin size={23} aria-hidden="true" /><span><small>Address</small><strong>{data.settings.venue_address}</strong></span></div><div><Clock3 size={23} aria-hidden="true" /><span><small>Program timing</small><strong>See each conference and competition for its schedule.</strong></span></div></div></div><RegistrationNotice data={data} /></section>
    <section className="explore-dark-section"><div className="container"><SectionHeading number="01" eyebrow="Before you arrive" title="A little planning. A better day." description="Check the published event information and contact us if you need anything clarified." /><div className="three-step-grid"><article><span>01</span><h3>Check your approval.</h3><p>Applications are reviewed by the organizers. Confirm your participation before making travel plans.</p></article><article><span>02</span><h3>Bring your essentials.</h3><p>Have your student identification and application reference with you. Read your competition’s equipment rules.</p></article><article><span>03</span><h3>Plan your journey.</h3><p>Use the campus map link for directions. Contact the team about campus access, parking, or accessibility support.</p></article></div></div></section>
    <section className="container explore-section venue-next"><div><span className="eyebrow">Need a hand?</span><h2>We’ll help you find your way.</h2><p className="muted">For campus access or accessibility questions, speak with the organizing team before you travel.</p></div><Link href="/contact" className="button button-outline">Contact the team<ArrowUpRight size={18} aria-hidden="true" /></Link></section>
  </>;
}

function Contact({ data }: { data: PublicContent }) {
  const [faq, setFaq] = useState<number | null>(null);
  const questions = [
    ["Is registration currently open?", registrationsAvailable(data) ? "Registration is open for published conferences and competitions. Submit your details on the registration page; the organizing team reviews each application." : "Registration is currently closed. The website will reflect the next edition when the organizers update the event date and open applications."],
    ["Can I enter with a team?", "Yes, for team competitions. Each competition lists its maximum team size. The registration form includes the team lead and lets you add the remaining participants."],
    ["Does submitting an application confirm my place?", "Your application first goes to the organizing team for review. Save your submission reference and contact the team to check your approval before attending."],
    ["How can my campus or organization collaborate?", "Use the form and choose Sponsorship & partnerships or Campus ambassadors. Tell us about your organization and your idea, and the organizing team can review it."],
  ];
  return <>
    <PageIntro eyebrow="06 / Let’s connect" title="A QUESTION?" accent="AN IDEA? SAY HELLO." description="Big plans start with a simple conversation. Reach out to the people making Capital Youth Expo happen." />
    <section className="container explore-section form-layout"><div className="form-sidebar contact-sidebar"><span className="eyebrow">Find your people</span><h2>We’re all ears.</h2><p>From competition questions to campus collaborations, your message goes directly to our organizing team.</p><div className="contact-details">{data.settings.contact_email && <a href={`mailto:${data.settings.contact_email}`}><Mail size={22} aria-hidden="true" /><span><small>Email the team</small><strong>{data.settings.contact_email}</strong></span><ArrowUpRight size={19} aria-hidden="true" /></a>}{data.settings.contact_phone && <a href={`tel:${data.settings.contact_phone.replace(/[^+\d]/g, "")}`}><Phone size={22} aria-hidden="true" /><span><small>Call the team</small><strong>{data.settings.contact_phone}</strong></span><ArrowUpRight size={19} aria-hidden="true" /></a>}<div><MapPin size={22} aria-hidden="true" /><span><small>Our meeting point</small><strong>{data.settings.venue}</strong><span>{data.settings.venue_address}</span></span></div></div><div className="contact-small-image"><ContentImage src="/images/recap3.webp" alt="Students connecting at a Capital Youth Expo gathering" /><span>REAL PEOPLE.<br />REAL CONNECTIONS.</span></div></div><ApplicationForm data={data} mode="contact" /></section>
    <section className="container explore-section faq-section"><SectionHeading number="01" eyebrow="A few quick answers" title="Good questions. Clear answers." /><div className="faq-list">{questions.map(([question, answer], index) => <article key={question}><button type="button" aria-expanded={faq === index} aria-controls={`faq-${index}`} onClick={() => setFaq(faq === index ? null : index)}><span className="faq-number">0{index + 1}</span><span>{question}</span>{faq === index ? <Minus size={21} aria-hidden="true" /> : <Plus size={21} aria-hidden="true" />}</button><div id={`faq-${index}`} hidden={faq !== index}><p>{answer}</p></div></article>)}</div></section>
  </>;
}

function Register({ data, defaultKind, defaultEntry }: { data: PublicContent; defaultKind?: "contest" | "conference"; defaultEntry?: string }) {
  return <>
    <PageIntro eyebrow="Your next move starts here" title="TAKE YOUR" accent="PLACE." description="Choose a conversation or a competition. Bring your ambition. We’ll take it from here." />
    <section className="container explore-section form-layout"><div className="form-sidebar"><span className="eyebrow">An experience worth joining</span><h2>One application.<br />New possibilities.</h2><p>Find your challenge or your conversation and send your details to the organizing team.</p><div className="registration-steps"><div><span>01</span><p><strong>Choose your experience</strong>Pick a published competition or conference.</p></div><div><span>02</span><p><strong>Add your people</strong>Enter your details and any teammates.</p></div><div><span>03</span><p><strong>Keep your reference</strong>Your application goes to the team for review.</p></div></div><div className="form-sidebar-note"><span className="eyebrow">A little help?</span><p>Read the <Link href="/competitions">competition rules</Link> or <Link href="/contact">talk to our team</Link> before applying.</p></div></div><ApplicationForm data={data} mode="registration" defaultKind={defaultKind} defaultEntry={defaultEntry} /></section>
  </>;
}

function BottomBanner({ eyebrow, title, href, label }: { eyebrow: string; title: string; href: string; label: string }) {
  return <section className="explore-bottom-banner"><div className="container"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><Link href={href} className="button">{label}<ArrowUpRight size={20} aria-hidden="true" /></Link></div></section>;
}

export default function ExplorePages({ data, view, defaultKind, defaultEntry }: ExploreProps) {
  return <SiteShell settings={data.settings}><div className={`explore-page explore-${view}`}>{view === "conferences" && <Conferences data={data} />}{view === "competitions" && <Competitions data={data} />}{view === "team" && <Team data={data} />}{view === "ambassadors" && <Ambassadors data={data} />}{view === "venue" && <Venue data={data} />}{view === "contact" && <Contact data={data} />}{view === "register" && <Register data={data} defaultKind={defaultKind} defaultEntry={defaultEntry} />}</div></SiteShell>;
}

