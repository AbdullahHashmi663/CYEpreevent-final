import { teamPortrait, teamAvatar } from "@/lib/team-portraits";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicContent } from "@/lib/cms-types";
import { ContentImage, PageIntro } from "../SiteShell";
import TeamMarquee from "../TeamMarquee";
import { SectionHeading, BottomBanner } from "./Shared";

export default function Team({ data }: { data: PublicContent }) {
  const segmentLeads = data.team.filter(member => member.show_as_segment_lead === true);
  return <>
    <PageIntro eyebrow="03 / The people behind the possibility" title="GOOD PEOPLE." accent="GREAT ENERGY." description="A collective of students, makers, and doers turning a shared vision into a day worth remembering." />
    <section className="container explore-section team-about-block"><div><span className="eyebrow">Built by youth. For youth.</span><h2>We believe the future<br />starts with connection.</h2></div><div><p>{data.settings.about_description}</p><Link href="/register" className="text-link">Be part of the movement<ArrowUpRight size={20} aria-hidden="true" /></Link></div></section>
    {segmentLeads.length > 0 && <section className="container explore-section team-section"><SectionHeading number="01" eyebrow="Meet the segment leads" title="The minds making it happen." />
      <div className="people-grid team-grid">{segmentLeads.map((person, index) => <article className="person-card" key={person.id}><div className={`person-image person-tint-${index % 3}`}><ContentImage src={teamPortrait(person)} fallbackSrc={teamAvatar(person)} alt={person.title} /><span className="person-count">{String(index + 1).padStart(2, "0")}</span></div><h3>{person.title}</h3><p className="person-role">{person.subtitle}</p><p className="person-bio">{person.description}</p></article>)}</div>
    </section>}
    <TeamMarquee members={data.team.map(({ id, title, subtitle, category, image_url, use_avatar, avatar_style }) => ({ id, title, subtitle, category, image_url, use_avatar, avatar_style }))} />
    {data.sponsors.length > 0 && <section className="explore-partners"><div className="container"><SectionHeading number="02" eyebrow="Stronger together" title="The people backing our purpose." /><div className="partner-grid" tabIndex={0} role="region" aria-label="Societies and their responsibilities — scroll to explore">{data.sponsors.map(partner => <article key={partner.id}><ContentImage src={partner.image_url} sizes="96px" alt={partner.title} /><div><h3>{partner.title}</h3><p>{partner.subtitle}</p>{partner.description && <p className="partner-responsibility">{partner.description}</p>}</div></article>)}</div></div></section>}
    <BottomBanner eyebrow="Find your next challenge" title="TAKE YOUR PLACE." href="/register" label="Explore registration" />
  </>;
}
