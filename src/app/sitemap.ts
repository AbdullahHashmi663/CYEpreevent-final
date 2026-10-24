import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, absoluteUrl } from "@/lib/seo";
import { getPublicContent } from "@/lib/server/content";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getPublicContent();
  return [
    ...PUBLIC_PAGES.map(page => ({ url: absoluteUrl(page.path) })),
    ...data.conferences.map(entry => ({ url: absoluteUrl("/conferences/" + encodeURIComponent(entry.id)), ...(entry.image_url ? { images: [absoluteUrl(entry.image_url)] } : {}) })),
  ];
}
