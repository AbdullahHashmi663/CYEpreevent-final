import { pageMetadata, PUBLIC_PAGES } from "@/lib/seo";
import { getPublicContent } from "@/lib/server/content";
import HomeExperience from "@/components/site/HomeExperience";

const seo = PUBLIC_PAGES[0];
export const metadata = pageMetadata(seo.title, seo.description, seo.path);
export const dynamic = "force-dynamic";

export default async function Home() {
  return <HomeExperience data={await getPublicContent()} />;
}
