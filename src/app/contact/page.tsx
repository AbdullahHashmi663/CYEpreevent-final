import type { Metadata } from "next";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact", description: "Contact the Capital Youth Expo pre-event organizing team about competitions, conferences, collaborations, or campus access." };

export default async function Page() {
  return <ExplorePages view="contact" data={await getPublicContent()} />;
}
