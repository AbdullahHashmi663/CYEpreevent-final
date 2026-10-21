"use client";

import type { ContentRecord } from "@/lib/cms-types";
import { ContentImage } from "./SiteShell";

export default function SocietyMarquee({ partners }: { partners: ContentRecord[] }) {
  if (!partners.length) return null;

  return <section className="partner-strip container" aria-label="Our societies">
    <div className="society-marquee-heading">
      <span className="eyebrow">A SHARED VISION. A STRONGER COMMUNITY.</span>
    </div>
    <div className="society-marquee-window">
      <div className="society-marquee-track">
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
