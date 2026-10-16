import type { Metadata } from "next";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Competitions", description: "Find your arena: coding, esports, literary arts, and creative competitions at Capital Youth Expo. Explore rules and team limits." };

export default async function Page() {
  return <ExplorePages view="competitions" data={await getPublicContent()} />;
}
