import { pageMetadata, PUBLIC_PAGES } from "@/lib/seo";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";

export const dynamic = "force-dynamic";
const seo = PUBLIC_PAGES[4];
export const metadata = pageMetadata(seo.title, seo.description, seo.path);

export default async function Page() {
  return <ExplorePages view="team" data={await getPublicContent()} />;
}
