import type { Metadata } from "next";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workshops & Talks", description: "Discover the Career Pro workshop and Talk at Capital Youth Expo. Explore session details and confirmed speakers." };

export default async function Page() {
  return <ExplorePages view="conferences" data={await getPublicContent()} />;
}
