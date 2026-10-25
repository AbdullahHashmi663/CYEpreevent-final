import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ContentRecord, PublicContent } from "@/lib/cms-types";

export function SectionHeading({ number, eyebrow, title, description }: { number: string; eyebrow: string; title: string; description?: string }) {
  return <div className="explore-section-heading"><div><span className="eyebrow"><span className="section-number">{number}</span> / {eyebrow}</span><h2>{title}</h2></div>{description && <p className="muted">{description}</p>}</div>;
}

export function RegistrationLink({ data, entry, kind }: { data: PublicContent; entry: ContentRecord; kind: "contest" | "conference" }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const open = (data.settings.registration_open && (!data.settings.event_date || data.settings.event_date >= today)) && data.databaseAvailable && (!entry.date || entry.date >= today);
  return <Link href={kind === "contest" ? `/competition-registration/${encodeURIComponent(entry.id)}` : `/register?kind=${kind}&entry=${encodeURIComponent(entry.id)}`} className={`button ${open ? "button-primary" : "button-outline"}`}>{open ? "Apply to join" : "Registration details"}<ArrowUpRight size={18} aria-hidden="true" /></Link>;
}

export function BottomBanner({ eyebrow, title, href, label }: { eyebrow: string; title: string; href: string; label: string }) {
  return <section className="explore-bottom-banner"><div className="container"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><Link href={href} className="button">{label}<ArrowUpRight size={20} aria-hidden="true" /></Link></div></section>;
}
