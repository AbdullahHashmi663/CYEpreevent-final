import type { Metadata } from "next";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Venue & Directions", description: "Find Capital Youth Expo pre-event at Bahria University Islamabad. View the venue address, directions, and practical information before you arrive." };

export default async function Page() {
  return <ExplorePages view="venue" data={await getPublicContent()} />;
}
