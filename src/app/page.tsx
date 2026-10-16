import { getPublicContent } from "@/lib/server/content";
import HomeExperience from "@/components/site/HomeExperience";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <HomeExperience data={await getPublicContent()} />;
}
