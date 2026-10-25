import { pageMetadata, PUBLIC_PAGES } from "@/lib/seo";
import ExplorePageShell from "@/components/site/ExplorePages";
import PageView from "@/components/site/views/Conferences";
import { getPublicContent } from "@/lib/server/content";

export const revalidate = 60;
const seo = PUBLIC_PAGES[1];
export const metadata = pageMetadata(seo.title, seo.description, seo.path);

export default async function Page() {
  const data = await getPublicContent();
  return <ExplorePageShell settings={data.settings} view="conferences"><PageView data={data} /></ExplorePageShell>;
}
