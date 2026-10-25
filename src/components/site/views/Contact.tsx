"use client";
import { whatsappContacts, whatsappNumber } from "@/lib/whatsapp-contacts";
import { useState } from "react";
import { ArrowUpRight, MapPin, Mail, MessageCircle, Plus, Minus } from "lucide-react";
import type { PublicContent } from "@/lib/cms-types";
import { ContentImage, PageIntro } from "../SiteShell";
import ApplicationForm, { registrationsAvailable } from "../ApplicationForm";
import { SectionHeading } from "./Shared";

export default function Contact({ data }: { data: PublicContent }) {
  const [faq, setFaq] = useState<number | null>(null);
  const questions = [
    ["Is registration currently open?", registrationsAvailable(data) ? "Registration is open for published conferences and competitions. Submit your details on the registration page; the organizing team reviews each application." : "Registration is currently closed. The website will reflect the next edition when the organizers update the event date and open applications."],
    ["Can I enter with a team?", "Yes, for team competitions. Each competition lists its maximum team size. The registration form includes the team lead and lets you add the remaining participants."],
    ["Does submitting an application confirm my place?", "Your application first goes to the organizing team for review. Save your submission reference and contact the team to check your approval before attending."],
    ["How can my campus or organization collaborate?", "Use the form and choose Sponsorship & partnerships. Tell us about your organization and your idea, and the organizing team can review it."],
  ];
  return <>
    <PageIntro eyebrow="06 / Let’s connect" title="A QUESTION?" accent="AN IDEA? SAY HELLO." description="Big plans start with a simple conversation. Reach out to the people making Capital Youth Expo pre-event happen." />
    <section className="container explore-section form-layout"><div className="form-sidebar contact-sidebar"><span className="eyebrow">Find your people</span><h2>We’re all ears.</h2><p>From competition questions to campus collaborations, your message goes directly to our organizing team.</p><div className="contact-details">{data.settings.contact_email && <a href={`mailto:${data.settings.contact_email}`}><Mail size={22} aria-hidden="true" /><span><small>Email the team</small><strong>{data.settings.contact_email}</strong></span><ArrowUpRight size={19} aria-hidden="true" /></a>}{whatsappContacts(data.settings).map(contact => <a key={contact.phone} href={`https://wa.me/${whatsappNumber(contact.phone)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={22} aria-hidden="true" /><span><small>WhatsApp message{contact.name ? ` · ${contact.name}` : ""}</small><strong>{contact.phone}</strong></span><ArrowUpRight size={19} aria-hidden="true" /></a>)}<div><MapPin size={22} aria-hidden="true" /><span><small>Our meeting point</small><strong>{data.settings.venue}</strong><span>{data.settings.venue_address}</span></span></div></div><div className="contact-small-image"><ContentImage src="/images/recap3.webp" alt="Students connecting at a Capital Youth Expo pre-event gathering" /><span>REAL PEOPLE.<br />REAL CONNECTIONS.</span></div></div><ApplicationForm data={{...data, team: [], speakers: [], sponsors: [], contests: []}} mode="contact" /></section>
    <section className="container explore-section faq-section"><SectionHeading number="01" eyebrow="A few quick answers" title="Good questions. Clear answers." /><div className="faq-list">{questions.map(([question, answer], index) => <article key={question}><button type="button" aria-expanded={faq === index} aria-controls={`faq-${index}`} onClick={() => setFaq(faq === index ? null : index)}><span className="faq-number">0{index + 1}</span><span>{question}</span>{faq === index ? <Minus size={21} aria-hidden="true" /> : <Plus size={21} aria-hidden="true" />}</button><div id={`faq-${index}`} hidden={faq !== index}><p>{answer}</p></div></article>)}</div></section>
  </>;
}
