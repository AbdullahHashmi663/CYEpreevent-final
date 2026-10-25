"use client";
import { teamPortrait, teamAvatar } from "@/lib/team-portraits";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Pause, Play, ArrowRight, ArrowLeft } from "lucide-react";
import type { ContentRecord } from "@/lib/cms-types";
import { ContentImage } from "./SiteShell";

export default function TeamMarquee({ members }: { members: ContentRecord[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);

  function move(direction: number, manual = true) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (manual) setPaused(true);
    const card = viewport.querySelector<HTMLElement>(".team-marquee-card");
    const track = viewport.querySelector<HTMLElement>(".team-marquee-copy");
    const step = (card?.offsetWidth || 280) + (track ? parseFloat(getComputedStyle(track).gap) || 0 : 22);
    const end = viewport.scrollWidth - viewport.clientWidth;
    const target = direction > 0 && viewport.scrollLeft >= end - 2 ? 0 : direction < 0 && viewport.scrollLeft <= 2 ? end : viewport.scrollLeft + direction * step;
    viewport.scrollTo({ left: target, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  useEffect(() => {
    if (paused || members.length < 2) return;
    const interval = window.setInterval(() => {
      const viewport = viewportRef.current;
      if (!viewport || document.hidden || viewport.matches(":hover, :focus-within") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const card = viewport.querySelector<HTMLElement>(".team-marquee-card");
      const track = viewport.querySelector<HTMLElement>(".team-marquee-copy");
      const step = (card?.offsetWidth || 280) + (track ? parseFloat(getComputedStyle(track).gap) || 0 : 22);
      const end = viewport.scrollWidth - viewport.clientWidth;
      viewport.scrollTo({ left: viewport.scrollLeft >= end - 2 ? 0 : viewport.scrollLeft + step, behavior: "smooth" });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [paused, members.length]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    setPaused(true);
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragRef.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!members.length) return null;
  return <section className="team-marquee-section" aria-labelledby="team-marquee-heading">
    <div className="container team-marquee-heading">
      <div><span className="eyebrow">The people. The energy.</span><h2 id="team-marquee-heading">Meet the team<br /><span>behind every moment.</span></h2><p>Different talents. One shared vision. Get to know the people bringing CYE to life.</p></div>
      <div className="team-gallery-controls">
        <button type="button" className="team-gallery-arrow" aria-label="Previous team member" aria-controls="team-member-gallery" onClick={() => move(-1)}><ArrowLeft size={22} aria-hidden="true" /></button>
        <button type="button" className="button button-outline team-marquee-control" aria-controls="team-member-gallery" aria-label={paused ? "Resume automatic team scrolling" : "Pause automatic team scrolling"} onClick={() => setPaused(value => !value)}>{paused ? <><Play size={17} aria-hidden="true" />Resume</> : <><Pause size={17} aria-hidden="true" />Pause</>}</button>
        <button type="button" className="team-gallery-arrow" aria-label="Next team member" aria-controls="team-member-gallery" onClick={() => move(1)}><ArrowRight size={22} aria-hidden="true" /></button>
      </div>
    </div>
    <div ref={viewportRef} id="team-member-gallery" className={"team-marquee-viewport" + (dragging ? " is-dragging" : "")} tabIndex={0} role="region" aria-roledescription="carousel" aria-label="Team members. Swipe, drag, or use the arrow buttons to explore." onPointerDown={startDrag} onPointerMove={event => { if (dragRef.current) event.currentTarget.scrollLeft = dragRef.current.scrollLeft - (event.clientX - dragRef.current.x); }} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { dragRef.current = null; setDragging(false); }} onDragStart={event => event.preventDefault()} onWheel={() => setPaused(true)} onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
      if (event.key === "Home" || event.key === "End") { event.preventDefault(); setPaused(true); event.currentTarget.scrollTo({ left: event.key === "Home" ? 0 : event.currentTarget.scrollWidth, behavior: "instant" }); }
    }}>
      <div className="team-marquee-track"><div className="team-marquee-copy">
        {members.map(person => <article className="team-marquee-card" key={person.id}>
          <div className="team-marquee-portrait"><ContentImage src={teamPortrait(person)} fallbackSrc={teamAvatar(person)} alt={person.title} /><span aria-hidden="true"><ArrowRight size={22} /></span></div>
          <div className="team-marquee-details"><h3>{person.title}</h3><p className="team-marquee-position">{person.subtitle || "Team member"}</p><p className="team-marquee-department"><span>Department</span>{person.category || "To be announced"}</p></div>
        </article>)}
      </div></div>
    </div>
    <p className="container team-marquee-hint">Swipe or drag to explore, or use the arrow buttons. Automatic scrolling pauses when you interact.</p>
  </section>;
}
