import type { Metadata } from "next";
import localFont from "next/font/local";
import { getPublicContent } from "@/lib/server/content";
import "./globals.css";
const sans = localFont({ src: "../fonts/Manrope-Variable.ttf", variable: "--font-sans", weight: "200 900", display: "swap" });
const display = localFont({ src: [{ path: "../fonts/NeueMachina-Regular.woff", weight: "400" }, { path: "../fonts/NeueMachina-Ultrabold.woff", weight: "800" }], variable: "--font-display", display: "swap" });
export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getPublicContent();
  const title = `${settings.event_name} — ${settings.hero_title} ${settings.hero_accent}`;
  return {
  metadataBase: new URL(process.env.APP_ORIGIN || "http://localhost:3000"),
  title: { default: title, template: `%s | ${settings.event_name}` },
  description: settings.hero_description,
  icons: { icon: "/brand/cye-emblem.png?v=orange-blue", shortcut: "/brand/cye-emblem.png?v=orange-blue", apple: "/brand/cye-emblem.png?v=orange-blue" },
  openGraph: { title, description: settings.hero_description, images: [{ url: settings.hero_image || "/images/recap3.webp", alt: `${settings.event_name} community` }] },
  };
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${sans.variable} ${display.variable}`}><body>{children}</body></html>;
}
