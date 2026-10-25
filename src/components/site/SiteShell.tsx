"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSiteMotion } from "./useSiteMotion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import type { SiteSettings } from "@/lib/cms-types";
const navigation = [["Home", "/"], ["Workshops & Talks", "/conferences"], ["Competitions", "/competitions"], ["Our team", "/team-about"], ["Venue", "/venue"], ["Contact", "/contact"]];
export function ContentImage({ src, alt, className = "", priority = false, fallbackSrc, srcSet, sizes = "(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw" }: { src: string; alt: string; className?: string; priority?: boolean; fallbackSrc?: string; srcSet?: string; sizes?: string }) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const displayedSource = (!src || failedSources.includes(src)) && fallbackSrc ? fallbackSrc : src;
  if (!displayedSource || failedSources.includes(displayedSource)) return <div className={`image-placeholder ${className}`} role="img" aria-label={alt}><span>{alt.split(" ").map(p=>p[0]).slice(0,2).join("")}</span></div>;
  const local = /^(\/images\/|\/api\/media\/|\/brand\/)/.test(displayedSource);
  if (srcSet || !local || /\.svg(?:\?|$)/.test(displayedSource)) {
    // Preserve explicit high-resolution sources and external CMS URLs without proxying arbitrary hosts.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={displayedSource} srcSet={displayedSource === src ? srcSet : undefined} sizes={sizes} width={1200} height={900} decoding="async" alt={alt} className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} onError={()=>setFailedSources(current => [...current, displayedSource])} />;
  }
  return <Image src={displayedSource} alt={alt} width={1200} height={900} sizes={sizes} quality={75} decoding="async" className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} onError={()=>setFailedSources(current => [...current, displayedSource])} />;
}
export function PageIntro({ eyebrow, title, accent, description }: { eyebrow: string; title: string; accent?: string; description?: string }) {
  return <header className="page-intro container"><p className="eyebrow"><span className="tiny-cross">✳</span>{eyebrow}</p><h1>{title}{accent && <><br/><span>{accent}</span></>}</h1>{description && <p className="page-intro-description">{description}</p>}</header>;
}
export function Star({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 100 100" className={className} aria-hidden="true"><path d="M50 0 58 29 75 7 73 35 93 25 81 45 100 50 77 58 93 75 68 72 75 93 57 79 50 100 42 77 25 93 28 68 7 75 21 57 0 50 23 42 7 25 32 28 25 7 43 21Z" fill="currentColor"/></svg>;
}
export default function SiteShell({ settings, children }: { settings: SiteSettings; children: React.ReactNode }) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  useSiteMotion(rootRef, pathname);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const registrationOpen = settings.registration_open && settings.event_date >= today;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(()=>{ if (!menuOpen) return; const escape = (e:KeyboardEvent)=>{if(e.key==="Escape")setMenuOpen(false);}; window.addEventListener("keydown",escape); return()=>window.removeEventListener("keydown",escape); },[menuOpen]);
  return <div className="site-shell" ref={rootRef}><a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header container"><Link href="/" className="brand" aria-label={`${settings.event_name} home`}>
      <Image src="/brand/cye-emblem.png" alt="" width={47} height={47} sizes="47px" style={{ height: "auto" }}/><span>{settings.event_name === "Capital Youth Expo pre-event"?<><b className="brand-title">CAPITAL YOUTH EXPO</b><small className="brand-prefix">PRE-EVENT AT BUIC</small></>:settings.event_name}</span></Link>
      <nav id="site-navigation" aria-label="Main navigation" className={menuOpen ? "site-navigation is-open" : "site-navigation"}>{navigation.map(([label,href])=><Link key={href} className={pathname===href?"active":""} href={href} onClick={()=>setMenuOpen(false)}>{label}</Link>)}</nav>
      <Link href={registrationOpen?"/register":"/conferences"} className="header-cta">{registrationOpen?"Get involved":"Explore the expo"}<ArrowUpRight size={17}/></Link><button className="menu-button" aria-label={menuOpen?"Close navigation":"Open navigation"} aria-expanded={menuOpen} aria-controls="site-navigation" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button></header>
    <main id="main-content">{children}</main>
    <section className="closing-cta container"><div><p className="eyebrow">GOOD PEOPLE. BIG POSSIBILITIES.</p><h2>YOU BELONG<br/>IN THE <span>ROOM.</span></h2></div><div className="closing-right"><Star/><p>Bring your curiosity. Find your community.<br/>Let’s make something happen.</p><Link className="button button-primary" href="/register">Register for the expo<ArrowUpRight size={18}/></Link></div></section>
    <footer className="site-footer"><div className="container"><div className="footer-top"><Link href="/" className="footer-brand">{settings.event_name}<span>ENGAGE. ENCOURAGE. EMPOWER.</span></Link><div className="footer-nav"><Link href="/contact">Say hello<ArrowUpRight size={16}/></Link><Link href="/competitions">Competitions<ArrowUpRight size={16}/></Link><a href={`mailto:${settings.contact_email}`}>{settings.contact_email}<ArrowUpRight size={16}/></a></div></div><div className="footer-bottom"><span>© 2026 {settings.event_name}. Made for what’s next.</span><div>{settings.instagram_url&&<a href={settings.instagram_url} target="_blank" rel="noopener noreferrer">Instagram<ArrowUpRight size={14}/></a>}{settings.linkedin_url&&<a href={settings.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn<ArrowUpRight size={14}/></a>}<a href="#main-content">Back to top ↑</a></div></div></div></footer>
  </div>;
}
