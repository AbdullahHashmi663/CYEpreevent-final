import type { Metadata } from "next";
import localFont from "next/font/local";
import { getPublicContent } from "@/lib/server/content";
import "./globals.css";
import { SITE_URL, SITE_NAME, absoluteUrl } from "@/lib/seo";
import StructuredData from "@/components/site/StructuredData";
const sans = localFont({ src: "../fonts/Manrope-Variable.ttf", variable: "--font-sans", weight: "200 900", display: "swap" });
const display = localFont({ src: [{ path: "../fonts/NeueMachina-Regular.woff", weight: "400" }, { path: "../fonts/NeueMachina-Ultrabold.woff", weight: "800" }], variable: "--font-display", display: "swap" });
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  title: { default: SITE_NAME, template: "%s | CYE Pre-Event BUIC" },
  icons: { icon: "/brand/cye-emblem.png?v=orange-blue", shortcut: "/brand/cye-emblem.png?v=orange-blue", apple: "/brand/cye-emblem.png?v=orange-blue" },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { settings } = await getPublicContent();
  const sameAs = [settings.instagram_url, settings.linkedin_url, "https://whatsapp.com/channel/0029Vb9FELHGOj9kL9Jffm0l"].filter(url => /^https:\/\//.test(url));
  const graph = {
    "@context": "https://schema.org", "@graph": [
      { "@type": "Organization", "@id": SITE_URL + "/#organization", name: SITE_NAME, url: SITE_URL, logo: absoluteUrl("/brand/cye-emblem.png"), email: settings.contact_email, sameAs },
      { "@type": "WebSite", "@id": SITE_URL + "/#website", name: SITE_NAME, url: SITE_URL, inLanguage: "en", publisher: { "@id": SITE_URL + "/#organization" } },
    ],
  };
  return <html lang="en" className={`${sans.variable} ${display.variable}`}><body><StructuredData data={graph} />{children}</body></html>;
}
