"use client";

import type { CSSProperties } from "react";
import { Pause, Play, ArrowRight } from "lucide-react";
import type { ContentRecord } from "@/lib/cms-types";
import { ContentImage } from "./SiteShell";

export default function TeamMarquee({ members }: { members: ContentRecord[] }) {
  if (!members.length) return null;
  return <section className="team-marquee-section" aria-labelledby="team-marquee-heading">
    <input type="checkbox" id="team-marquee-pause" className="visually-hidden team-marquee-toggle" aria-label="Pause automatic team scrolling" />
    <div className="container team-marquee-heading">
      <div><span className="eyebrow">The people. The energy.</span><h2 id="team-marquee-heading">Meet the team<br /><span>behind every moment.</span></h2><p>Different talents. One shared vision. Get to know the people bringing CYE to life.</p></div>
      <label htmlFor="team-marquee-pause" className="button button-outline team-marquee-control"><span className="team-marquee-pause-label"><Pause size={17} aria-hidden="true" />Pause</span><span className="team-marquee-resume-label"><Play size={17} aria-hidden="true" />Resume</span></label>
    </div>
    <div className="team-marquee-viewport" tabIndex={0} role="region" aria-label="Team member gallery. Scroll horizontally to explore names, positions and departments.">
      <div className="team-marquee-track" style={{ "--team-marquee-duration": `${Math.max(32, members.length * 7)}s` } as CSSProperties}>
        {[false, true].map(duplicate => <div className="team-marquee-copy" aria-hidden={duplicate || undefined} key={String(duplicate)}>
          {members.map(person => <article className="team-marquee-card" key={person.id}>
            <div className="team-marquee-portrait"><ContentImage src={person.image_url} alt={duplicate ? "" : person.title} /><span aria-hidden="true"><ArrowRight size={22} /></span></div>
            <div className="team-marquee-details"><h3>{person.title}</h3><p className="team-marquee-position">{person.subtitle || "Team member"}</p><p className="team-marquee-department"><span>Department</span>{person.category || "To be announced"}</p></div>
          </article>)}
        </div>)}
      </div>
    </div>
    <p className="container team-marquee-hint">Hover or focus to pause. You can also scroll to explore.</p>
  </section>;
}
