import type { Metadata } from "next";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campus Ambassadors", description: "Bring Capital Youth Expo to your campus. Learn about the ambassador role and submit your application when registration opens." };

export default async function Page() {
  return <ExplorePages view="ambassadors" data={await getPublicContent()} />;
}
