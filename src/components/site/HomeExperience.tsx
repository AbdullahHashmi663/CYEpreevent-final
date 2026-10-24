"use client";
import { teamPortrait, teamAvatar } from "@/lib/team-portraits";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight, ArrowDown, ArrowRight, Code2, Lightbulb, Mic, Palette, MapPin, CalendarDays, Sparkles, Users, Ticket, Clock3, Trophy } from "lucide-react";
import type { ContentRecord, PublicContent } from "@/lib/cms-types";
import SiteShell, { ContentImage } from "./SiteShell";
import SocietyMarquee from "./SocietyMarquee";
import { requiresPayment } from "@/lib/programme";

function ProgrammeFee({ conference }: { conference: ContentRecord }) {
  const regularFee = 500;
  const earlyBird = conference.id === "career-pro" && conference.fee > 0 && conference.fee < regularFee;
  return <p className="programme-fee">{earlyBird ? <><strong>Early bird: Rs {conference.fee.toLocaleString("en-PK")} per person</strong><span className="programme-regular-fee">Regular price: <s>Rs {regularFee}</s></span><span className="programme-saving">Save Rs {(regularFee - conference.fee).toLocaleString("en-PK")}</span></> : requiresPayment(conference) ? conference.fee > 0 ? `Workshop fee: Rs ${conference.fee.toLocaleString("en-PK")} per person` : "Workshop fee: To be announced" : "Talk: Free"}</p>;
}

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - start) / 1100, 1);
        element.textContent = Math.round(value * (1 - Math.pow(1 - progress, 3))).toLocaleString();
        if (progress < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }, { threshold: .6 });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <span aria-label={value.toLocaleString()}><span ref={ref} aria-hidden="true">{value.toLocaleString()}</span></span>;
}

const disciplines = [
  { name: "Tech Nexus", label: "CODE. BUILD. SOLVE.", description: "Speed Programming and Hackathon. Bring your problem-solving skills and build something that matters.", icon: Code2, className: "discipline-blue", href: "/competitions#tech-nexus" },
  { name: "Venture X", label: "PITCH YOUR IDEA", description: "A stage for your next big idea. Share your vision and show the potential of your venture.", icon: Lightbulb, className: "discipline-orange", href: "/competitions#venture-x" },
  { name: "Spectrum", label: "CREATE YOUR OWN PERSPECTIVE", description: "Reel Competition and Graphic Design. Turn your creativity into something people remember.", icon: Palette, className: "discipline-blue", href: "/competitions#spectrum" },
  { name: "Literary", label: "MAKE YOUR VOICE HEARD", description: "Step up to the microphone for Speech. Bring a fresh perspective and make every word count.", icon: Mic, className: "discipline-orange", href: "/competitions#literary" },
];
const gallery = [
  "WhatsApp Image 2026-10-21 at 12.48.29 PM.jpeg",
  "WhatsApp Image 2026-10-21 at 12.48.30 PM.jpeg",
  "WhatsApp Image 2026-10-21 at 12.48.32 PM.jpeg",
  "WhatsApp Image 2026-10-21 at 12.48.33 PM.jpeg",
  "WhatsApp Image 2026-10-21 at 12.48.34 PM.jpeg",
  "WhatsApp Image 2026-10-21 at 12.48.35 PM.jpeg",
  "WhatsApp Image 2026-10-21 at 12.48.36 PM (1).jpeg",
  "WhatsApp Image 2026-10-21 at 12.48.36 PM.jpeg",
  "WhatsApp Image 2026-10-21 at 12.48.37 PM (1).jpeg",
  "WhatsApp Image 2026-10-21 at 12.48.37 PM.jpeg",
].map(filename => `/images/Events_Images2023/${encodeURIComponent(filename)}`);

export default function HomeExperience({ data }: { data: PublicContent }) {
  const { settings } = data;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const open = settings.registration_open && settings.event_date >= today;
  const team = (data.team.some(member => member.featured) ? data.team.filter(member => member.featured) : data.team).slice(0, 3);
  const metrics = [
    { value: data.contests.length, label: "Competition experiences", icon: Ticket },
    { value: data.conferences.length, label: "Talks & workshops", icon: Mic },
    { value: data.team.length, label: "People making it happen", icon: Users },
    { value: 3, unit: "Million PKR", label: "Prize Pool on Main CYE Event", icon: Trophy },
  ];
  return <SiteShell settings={settings}>
    <section className="expo-hero" aria-labelledby="expo-hero-title">
      <div className="hero-backdrop" aria-hidden="true"><ContentImage src={settings.hero_image} alt="" priority /></div>
      <div className="orbit-art orbit-art-hero" aria-hidden="true"><i/><i/><i/></div>
      <div className="hero-content container">
        <p className="hero-eyebrow"><span/> ENGAGE <b>•</b> ENCOURAGE <b>•</b> EMPOWER <span/></p>
        <h1 id="expo-hero-title">{settings.hero_title}<br/><span>{settings.hero_accent}</span></h1>
        <p className="hero-description">{settings.hero_description}</p>
        <div className="hero-event-details"><span><CalendarDays size={19}/>{settings.date_label}</span><i/><span><MapPin size={19}/>{settings.venue}</span></div>
        <div className="hero-actions"><Link className="button button-primary" href={open ? "/register" : "/competitions"}>{open ? "Register now" : "Discover the competitions"}<ArrowUpRight size={19}/></Link><Link className="button button-outline" href="/contact">Partner with the expo<ArrowUpRight size={19}/></Link></div>
        <div className="hero-quick-links"><Link href="/conferences">The programme<ArrowUpRight size={14}/></Link><Link href="/team-about">Meet the team<ArrowUpRight size={14}/></Link><Link href="/venue">Plan your visit<ArrowUpRight size={14}/></Link></div>
        <div className="hero-bottom"><span className={`event-state ${open ? "event-state-open" : ""}`}><span/>{open ? "Applications are open" : "Registration currently closed"}</span><a href="#about-expo" className="scroll-cue">Explore the experience<ArrowDown size={16}/></a></div>
      </div>
    </section>
    <SocietyMarquee partners={data.sponsors}/>
    <section className="expo-about container" id="about-expo">
      <div className="centered-heading" data-reveal><p className="eyebrow">MORE THAN A DAY ON YOUR CALENDAR</p><h2>THIS IS CAPITAL<br/><span>YOUTH EXPO</span><br/>PRE-EVENT.</h2><p>A place where curiosity meets opportunity, and the next generation finds its voice.</p></div>
      <div className="about-grid" data-reveal><div className="about-image"><ContentImage src="/images/recap3.webp" alt="The Capital Youth Expo pre-event audience"/><div className="image-label"><Sparkles size={19}/><span>Big energy. Bigger possibilities.</span></div></div><div className="about-copy"><span className="eyebrow">FOR THE THINKERS. THE MAKERS. THE DOERS.</span><h3>One community.<br/>So many ways to <em>grow.</em></h3><p>{settings.about_description}</p><Link className="text-link" href="/team-about">Discover the people behind CYE<ArrowUpRight size={18}/></Link></div></div>
    </section>
    <section className="community-metrics"><div className="orbit-art orbit-art-metrics" aria-hidden="true"><i/><i/><i/></div><div className="container"><p className="eyebrow">YOUR NEXT CHAPTER STARTS WITH CONNECTION</p><div className="metrics-grid">{metrics.map(metric => <div className="metric" key={metric.label}><metric.icon size={25} strokeWidth={1.5} aria-hidden="true"/><strong><CountUp value={metric.value}/>{metric.unit && <span className="metric-unit">{metric.unit}</span>}</strong><p>{metric.label}</p></div>)}</div><p className="metrics-caption">Different strengths. Shared ambition. Come and find your place.</p></div></section>
    <section className="disciplines-section container" id="disciplines"><div className="centered-heading" data-reveal><p className="eyebrow">FIND YOUR KIND OF ENERGY</p><h2>A WORLD OF<br/><span>POSSIBILITIES.</span></h2><p>Build something. Challenge yourself. Start a conversation. There’s more than one way to leave your mark.</p></div><div className="disciplines-grid">{disciplines.map((discipline, index) => <Link className={`discipline-card ${discipline.className}`} href={discipline.href} key={discipline.name} data-reveal><div className="discipline-card-top"><span className="discipline-icon"><discipline.icon size={30} strokeWidth={1.5}/></span><span className="discipline-index">0{index + 1}</span></div><p className="eyebrow">{discipline.label}</p><h3>{discipline.name}</h3><p>{discipline.description}</p><span className="discipline-link">Explore this experience<ArrowUpRight size={19}/></span></Link>)}</div></section>
    {data.conferences.length > 0 && <section className="home-programme"><div className="container"><div className="section-heading" data-reveal><div><p className="eyebrow">ON THE PROGRAMME</p><h2>IDEAS THAT<br/><span>MOVE US FORWARD.</span></h2></div><Link className="button button-outline" href="/conferences">Explore the programme<ArrowUpRight size={18}/></Link></div><div className="home-programme-grid">{data.conferences.map((conference,index) => {
      const speakers = conference.speaker_ids.flatMap(id => data.speakers.filter(speaker => speaker.id === id));
      const speakerSubtitle = !speakers.length && conference.category === "Talk" && conference.subtitle;
      return <Link className="home-conference" href={`/conferences#${conference.id}`} key={conference.id} data-reveal><div className="home-conference-image"><ContentImage src={conference.image_url} alt={conference.title}/><span>{conference.category || "Conference"}</span></div><div className="home-conference-copy"><p className="eyebrow"><Clock3 size={14}/>{conference.time || "Time to be announced"}</p><h3>{conference.title}<ArrowUpRight size={25}/></h3><ProgrammeFee conference={conference}/>{speakerSubtitle ? <p className="programme-speakers"><strong>Speakers</strong><span>{speakerSubtitle}</span></p> : <p>{conference.subtitle || conference.description}</p>}{speakers.length > 0 && <div className="programme-speakers"><strong>Speakers</strong>{speakers.map(speaker => <p key={speaker.id}><b>{speaker.title}</b>{speaker.subtitle && <span>{speaker.subtitle}</span>}</p>)}</div>}<span className="conference-number">0{index+1}</span></div></Link>;
    })}</div></div></section>}
    <section className="recap-section"><div className="container centered-heading" data-reveal><p className="eyebrow">THE MOMENTS THAT STAY WITH US</p><h2>REAL PEOPLE.<br/><span>UNFORGETTABLE ENERGY.</span></h2><p>A glimpse of the conversations, connections, and shared moments that bring our community to life.</p></div><div className="gallery-window"><div className="gallery-track">{[0,1].map(copy=><div className="gallery-group" key={copy} aria-hidden={copy===1}>{gallery.map((src,index)=><figure key={src}><ContentImage src={src} alt={copy===0?`Capital Youth Expo pre-event archive, moment ${index+1}`:""}/><figcaption>CAPITAL YOUTH EXPO <span>COMMUNITY ARCHIVE ↗</span></figcaption></figure>)}</div>)}</div></div></section>
    {team.length > 0 && <section className="home-team container"><div className="centered-heading" data-reveal><p className="eyebrow">PEOPLE WITH PURPOSE</p><h2>MEET THE PEOPLE<br/><span>BEHIND THE POSSIBLE.</span></h2><p>A team turning shared ambition into an experience worth remembering.</p></div><div className="home-people-grid">{team.map(member=><Link className="home-person" href="/team-about" key={member.id} data-reveal><div><ContentImage src={teamPortrait(member)} fallbackSrc={teamAvatar(member)} alt={member.title}/><span className="circle-arrow"><ArrowUpRight size={20}/></span></div><h3>{member.title}</h3><p>{member.subtitle}</p></Link>)}</div><div className="team-link"><Link className="button button-outline" href="/team-about">Meet the whole team<ArrowUpRight size={18}/></Link></div></section>}
    <section className="home-venue container" data-reveal><div className="venue-visual"><ContentImage src="/images/bahria-auditorium.png" alt="Audience seated in the Bahria University auditorium"/></div><div className="home-venue-copy"><p className="eyebrow"><MapPin size={16}/> THE PLACE WHERE IT HAPPENS</p><h2>{settings.venue}</h2><p>{settings.venue_address}</p><span className="venue-date"><CalendarDays size={17}/>{settings.date_label}</span><Link className="button button-primary" href="/venue">Plan your visit<ArrowRight size={18}/></Link></div></section>
  </SiteShell>;
}
