import type { Metadata } from "next";
export const SITE_URL = "https://cyepreeventbuic.com";
export const SITE_NAME = "Capital Youth Expo Pre-Event at BUIC";
export const SOCIAL_IMAGE = "/brand/cye-social.png";
export const absoluteUrl = (path = "/") => new URL(path, SITE_URL).href;
export function pageMetadata(title: string, description: string, path: string, noindex = false): Metadata {
  const fullTitle = path === "/" ? title : title + " | CYE Pre-Event BUIC";
  return {
    title: { absolute: fullTitle }, description,
    alternates: { canonical: absoluteUrl(path) },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    openGraph: { type: "website", locale: "en_PK", siteName: SITE_NAME, url: absoluteUrl(path), title: fullTitle, description, images: [{ url: absoluteUrl(SOCIAL_IMAGE), width: 1200, height: 630, alt: SITE_NAME + " — workshops, talks and competitions" }] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [absoluteUrl(SOCIAL_IMAGE)] },
  };
}
export const PUBLIC_PAGES = [
  { path: "/", title: "Capital Youth Expo Pre-Event at BUIC | Islamabad", description: "Join the Capital Youth Expo pre-event at Bahria University Islamabad. Explore the Career Pro workshop, Purpose of Life talk, competitions and registration." },
  { path: "/conferences", title: "Workshops & Talks in Islamabad", description: "Explore the Career Pro workshop and Purpose of Life talk at Bahria University Islamabad. See speakers, session times, workshop fees and registration." },
  { path: "/competitions", title: "Student Competitions & Rulebooks", description: "Explore Speed Programming, Hackathon, Pitch Your Idea, Reel, Graphic Design and English/Urdu Speech. Find rulebooks, team sizes and registration forms." },
  { path: "/venue", title: "Bahria University Islamabad — Venue & Directions", description: "Plan your visit to the CYE pre-event at Bahria University Islamabad, Shangrilla Road, Sector E-8. Find the campus address, directions and visitor information." },
  { path: "/team-about", title: "Meet the Organizing Team", description: "Meet the student organizers and segment leads bringing the Capital Youth Expo pre-event to Bahria University Islamabad. Get to know the team behind the event." },
  { path: "/contact", title: "Contact the BUIC Organizing Team", description: "Contact the CYE pre-event team at Bahria University Islamabad. Ask about workshops, talks, competitions and collaborations, or connect on WhatsApp." },
] as const;
