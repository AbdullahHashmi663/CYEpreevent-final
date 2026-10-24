# Website SEO

The canonical production origin is https://cyepreeventbuic.com. Public editorial pages and published session detail pages are listed in /sitemap.xml; /robots.txt points to it. Registration forms use noindex,follow; admin pages use noindex,nofollow and API responses also send X-Robots-Tag. Admin URLs remain crawlable so crawlers can read noindex. Authentication is still required for private data.

Every public page has its own title, description, canonical, Open Graph and Twitter card. The 1200×630 share image is /brand/cye-social.png. Organization and WebSite JSON-LD appear sitewide. Each session has its own /conferences/[id] page with visible details, breadcrumb schema and Event schema derived from published admin content. Event markup is omitted during database fallback. Unknown session times are not invented. Registration fees come from the current session record.

## Owner action: Search Console

Verify cyepreeventbuic.com as a Domain property in Google Search Console using Google's exact DNS TXT value at Namecheap. Preserve existing DNS records. Submit https://cyepreeventbuic.com/sitemap.xml, then inspect the homepage and both session URLs and request indexing. For a URL-prefix property, the optional GOOGLE_SITE_VERIFICATION environment variable adds the HTML verification tag on the next deployment. Never put a service account key in this variable.

Search Console access and a verification value were not supplied; verification or submission has not been claimed. No analytics tracking was installed without an account or measurement ID.

## Ongoing maintenance

Keep session dates, times, fees, speakers and registration status accurate in admin. After the event, close registrations and retain useful recap information; do not recycle old session URLs for a different event. Review Search Console coverage, search queries, mobile Core Web Vitals and broken URLs after Google has collected data. Obtain relevant links from BUIC, participating societies, speakers and the main CYE website; search rankings and rich results are not guaranteed.

## Verification

Run node scripts/test-seo.mjs, npm run lint, npx tsc --noEmit and the production build. After deployment run node scripts/audit-live-seo.mjs. The live audit checks response status, canonical/title/description, robots, social cards, parseable JSON-LD, the public sitemap, session dates, private-route indexing controls, invalid session 404s and redirect targets. No test submits a registration.
