"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Clock3, Search, Users, Code2, Lightbulb, Mic2, Palette, Plus, Minus } from "lucide-react";
import type { PublicContent } from "@/lib/cms-types";
import { COMPETITION_SECTIONS, programmeGroups, programmeSection } from "@/lib/programme";
import { PageIntro } from "../SiteShell";
import { COMPETITION_RULEBOOKS } from "@/lib/competition-rulebooks";
import { SectionHeading, RegistrationLink, BottomBanner } from "./Shared";

function ContestIcon({ category }: { category: string }) {
  const props = { size: 27, strokeWidth: 1.6, "aria-hidden": true as const };
  if (/tech/i.test(category)) return <Code2 {...props} />;
  if (/venture/i.test(category)) return <Lightbulb {...props} />;
  if (/spectrum|creative|art/i.test(category)) return <Palette {...props} />;
  return <Mic2 {...props} />;
}

export default function Competitions({ data }: { data: PublicContent }) {
  const [category, setCategory] = useState("All disciplines");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const groups = programmeGroups(data.contests, "contests");
  const categories = ["All disciplines", ...groups.filter(group => group.entries.length).map(group => group.name)];
  const filtered = data.contests.filter(entry => (category === "All disciplines" || programmeSection(entry) === category) && `${entry.title} ${programmeSection(entry)} ${entry.subtitle} ${entry.description}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <>
    <PageIntro eyebrow="02 / Four sections. Your next challenge." title="SHOW UP." accent="STAND OUT." description="Tech Nexus. Venture X. Spectrum. Literary. Find your people, choose your challenge, and bring your best." />
    <section className="container explore-section">
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
          {COMPETITION_RULEBOOKS[contest.id] && <a className="text-link" href={COMPETITION_RULEBOOKS[contest.id].url} target="_blank" rel="noopener noreferrer">Read the competition rulebook (PDF) ↗</a>}
          <RegistrationLink data={data} entry={contest} kind="contest" />
        </article>;
      })}</div>{!group.entries.length && <p className="programme-coming-soon">This section’s competition details will be published soon.</p>}</section>)}
      {filtered.length === 0 && <div className="explore-empty"><Search size={32} aria-hidden="true" /><h2>No matches just yet.</h2><p>{data.contests.length ? "Try another search or explore all disciplines." : "The next competition lineup will appear here when it’s published."}</p>{data.contests.length > 0 && <button className="button button-outline" onClick={() => { setCategory("All disciplines"); setQuery(""); }}>Reset filters<ArrowUpRight size={17} aria-hidden="true" /></button>}</div>}
    </section>
    <section className="explore-dark-section"><div className="container"><SectionHeading number="03" eyebrow="From idea to arena" title="Your move. Three steps." /><div className="three-step-grid">{[["01", "Find your challenge.", "Explore the disciplines and read the rules. Choose the experience that fits your strengths."], ["02", "Make your application.", "When registration opens, enter your details and add your teammates where needed."], ["03", "Await your approval.", "The organizers review your application. Keep your reference handy when contacting the team."]].map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
    <BottomBanner eyebrow="Questions about your entry?" title="LET’S TALK IT THROUGH." href="/contact" label="Contact the team" />
  </>;
}
