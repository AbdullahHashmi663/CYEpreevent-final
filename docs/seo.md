# Website SEO

The canonical production origin is https://cyepreeventbuic.com. Public editorial pages and published session detail pages are listed in /sitemap.xml; /robots.txt points to it. Registration forms use noindex,follow; admin pages use noindex,nofollow and API responses also send X-Robots-Tag. Admin URLs remain crawlable so crawlers can read noindex. Authentication is still required for private data.

Every public page has its own title, description, canonical, Open Graph and Twitter card. The 1200×630 share image is /brand/cye-social.png. Organization and WebSite JSON-LD appear sitewide. Each session has its own /conferences/[id] page with visible details, breadcrumb schema and Event schema derived from published admin content. Event markup is omitted during database fallback. Unknown session times are not invented. Registration fees come from the current session record.

## Search Console status — 25 October 2026

The canonical URL-prefix property https://cyepreeventbuic.com/ is verified using the Google HTML tag. GOOGLE_SITE_VERIFICATION is configured in Vercel Production; retain it to keep ownership verified. The sitemap reports Success and 8 discovered public pages. The homepage and Career Pro detail page were confirmed indexed. An indexing request for the Purpose of Life talk was accepted and is awaiting Google processing. No analytics tracking was installed without an account or measurement ID.

## Google search favicon

The explicit favicon is a square 192×192 PNG at the stable URL /brand/cye-favicon.png. The standard /favicon.ico is also retained. Apple devices use /apple-icon.png (180×180). Avoid pointing favicon metadata at the non-square full logo or changing its URL frequently. Google may take several days to several weeks to refresh the search-result favicon after recrawling; display is not guaranteed. Reference: https://developers.google.com/search/docs/appearance/favicon-in-search

## Ongoing maintenance

Keep session dates, times, fees, speakers and registration status accurate in admin. After the event, close registrations and retain useful recap information; do not recycle old session URLs for a different event. Review Search Console coverage, search queries, mobile Core Web Vitals and broken URLs after Google has collected data. Obtain relevant links from BUIC, participating societies, speakers and the main CYE website; search rankings and rich results are not guaranteed.

## Verification

Run node scripts/test-seo.mjs, npm run lint, npx tsc --noEmit and the production build. After deployment run node scripts/audit-live-seo.mjs. The live audit checks response status, canonical/title/description, robots, social cards, parseable JSON-LD, the public sitemap, session dates, private-route indexing controls, invalid session 404s and redirect targets. No test submits a registration.
