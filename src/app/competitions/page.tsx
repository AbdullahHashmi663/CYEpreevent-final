import type { Metadata } from "next";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Competitions", description: "Explore Tech Nexus, Venture X, Spectrum, and Literary at Capital Youth Expo pre-event: programming, hackathon, pitching, reels, graphic design, and speech." };

export default async function Page() {
  return <ExplorePages view="competitions" data={await getPublicContent()} />;
}
