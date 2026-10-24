import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  // Leave noindex pages crawlable so search engines can read their directives.
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/"] }, sitemap: SITE_URL + "/sitemap.xml", host: SITE_URL };
}
