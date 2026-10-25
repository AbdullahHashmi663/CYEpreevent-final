"use client";
import { teamPortrait, teamAvatar } from "@/lib/team-portraits";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { ContentRecord } from "@/lib/cms-types";
import { ContentImage } from "./SiteShell";

export type TeamGalleryMember = Pick<ContentRecord, "id" | "title" | "subtitle" | "category" | "image_url" | "use_avatar" | "avatar_style">;

export default function TeamMarquee({ members }: { members: TeamGalleryMember[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const interactionRef = useRef({ active: false, resumeAt: 0 });
  const [copies, setCopies] = useState(2);
  const [dragging, setDragging] = useState(false);

  function move(direction: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    interactionRef.current.resumeAt = performance.now() + 900;
    const card = viewport.querySelector<HTMLElement>(".team-marquee-card");
    const track = viewport.querySelector<HTMLElement>(".team-marquee-copy");
    const step = (card?.offsetWidth || 280) + (track ? parseFloat(getComputedStyle(track).gap) || 0 : 22);
    const cycle = track?.offsetWidth || viewport.scrollWidth / copies;
    if (direction < 0 && viewport.scrollLeft < step) viewport.scrollLeft += cycle;
    const target = viewport.scrollLeft + direction * step;
    viewport.scrollTo({ left: target, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = viewport?.querySelector<HTMLElement>(".team-marquee-copy");
    if (!viewport || !track || members.length < 2) return;
    let cycle = track.offsetWidth;
    const resize = new ResizeObserver(() => {
      cycle = track.offsetWidth;
      if (cycle) setCopies(Math.max(2, Math.ceil(viewport.clientWidth / cycle) + 1));
    });
    resize.observe(viewport);
    resize.observe(track);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let visible = false;
    let position = viewport.scrollLeft;
    let lastWritten = viewport.scrollLeft;
    const animate = (now: number) => {
      const elapsed = previous ? Math.min(now - previous, 50) : 0;
      previous = now;
      if (document.hidden || reducedMotion.matches || interactionRef.current.active || now < interactionRef.current.resumeAt || !cycle) {
        position = viewport.scrollLeft;
        lastWritten = position;
      } else {
        // Preserve fractional progress so slower displays still scroll smoothly.
        if (Math.abs(viewport.scrollLeft - lastWritten) > 2) position = viewport.scrollLeft;
        position = (position + elapsed * 0.035) % cycle;
        viewport.scrollLeft = position;
        lastWritten = viewport.scrollLeft;
      }
      if (visible && !document.hidden && !reducedMotion.matches) frame = window.requestAnimationFrame(animate);
    };
    const sync = () => {
      window.cancelAnimationFrame(frame);
      previous = 0;
      if (visible && !document.hidden && !reducedMotion.matches) frame = window.requestAnimationFrame(animate);
    };
    const visibility = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); sync(); }, { rootMargin: "120px" });
    visibility.observe(viewport);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    return () => { window.cancelAnimationFrame(frame); resize.disconnect(); visibility.disconnect(); document.removeEventListener("visibilitychange", sync); reducedMotion.removeEventListener("change", sync); };
  }, [members.length]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    interactionRef.current.active = true;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragRef.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    interactionRef.current.active = false;
    interactionRef.current.resumeAt = performance.now() + 900;
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
        <button type="button" className="team-gallery-arrow" aria-label="Next team member" aria-controls="team-member-gallery" onClick={() => move(1)}><ArrowRight size={22} aria-hidden="true" /></button>
      </div>
    </div>
    <div ref={viewportRef} id="team-member-gallery" className={"team-marquee-viewport" + (dragging ? " is-dragging" : "")} tabIndex={0} role="region" aria-roledescription="carousel" aria-label="Team members. Swipe, drag, or use the arrow buttons to explore." onPointerDown={startDrag} onPointerMove={event => { if (dragRef.current) event.currentTarget.scrollLeft = dragRef.current.scrollLeft - (event.clientX - dragRef.current.x); }} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { dragRef.current = null; interactionRef.current.active = false; interactionRef.current.resumeAt = performance.now() + 900; setDragging(false); }} onDragStart={event => event.preventDefault()} onWheel={() => { interactionRef.current.resumeAt = performance.now() + 900; }} onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
      if (event.key === "Home" || event.key === "End") { event.preventDefault(); interactionRef.current.resumeAt = performance.now() + 900; event.currentTarget.scrollTo({ left: event.key === "Home" ? 0 : event.currentTarget.scrollWidth, behavior: "instant" }); }
    }}>
      <div className="team-marquee-track">{Array.from({length: copies}, (_, copy) => <div className="team-marquee-copy" key={copy} aria-hidden={copy > 0 || undefined}>
        {members.map(person => <article className="team-marquee-card" key={person.id}>
          <div className="team-marquee-portrait"><ContentImage sizes="(max-width: 600px) 250px, 280px" src={teamPortrait(person)} fallbackSrc={teamAvatar(person)} alt={copy > 0 ? "" : person.title} /><span aria-hidden="true"><ArrowRight size={22} /></span></div>
          <div className="team-marquee-details"><h3>{person.title}</h3><p className="team-marquee-position">{person.subtitle || "Team member"}</p><p className="team-marquee-department"><span>Department</span>{person.category || "To be announced"}</p></div>
        </article>)}
      </div>)}</div>
    </div>
    <p className="container team-marquee-hint">Swipe or drag to explore, or use the arrow buttons. The gallery continues moving automatically.</p>
  </section>;
}
