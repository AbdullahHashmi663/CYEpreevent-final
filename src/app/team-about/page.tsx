import type { Metadata } from "next";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Our People", description: "Meet the student organizers, makers, and community partners behind Capital Youth Expo." };

export default async function Page() {
  return <ExplorePages view="team" data={await getPublicContent()} />;
}
