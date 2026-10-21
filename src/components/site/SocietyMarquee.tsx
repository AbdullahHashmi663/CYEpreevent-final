"use client";

import { useId, useState } from "react";
import type { ContentRecord } from "@/lib/cms-types";
import { ContentImage } from "./SiteShell";

export default function SocietyMarquee({ partners }: { partners: ContentRecord[] }) {
  const [paused, setPaused] = useState(false);
  const trackId = useId();
  if (!partners.length) return null;

  return <section className="partner-strip container" aria-label="Our societies">
    <div className="society-marquee-heading">
      <span className="eyebrow">A SHARED VISION. A STRONGER COMMUNITY.</span>
      <button type="button" className="society-marquee-control" aria-controls={trackId} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}<span className="sr-only"> society animation</span></button>
    </div>
    <div className="society-marquee-window">
      <div id={trackId} className="society-marquee-track" data-paused={paused}>
        {[0, 1].map(copy => <div className="society-marquee-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
          {partners.map(partner => <div className="partner" key={partner.id}>
            <ContentImage src={partner.image_url} alt={copy === 0 ? partner.title : ""}/>
            <span>{partner.title}{partner.subtitle && <small>{partner.subtitle}</small>}{partner.description && <small>{partner.description}</small>}</span>
          </div>)}
        </div>)}
      </div>
    </div>
  </section>;
}
