import type { Metadata } from "next";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conferences", description: "Explore Capital Youth Expo conferences, published speakers, and conversations on technology, creativity, and the future." };

export default async function Page() {
  return <ExplorePages view="conferences" data={await getPublicContent()} />;
}
