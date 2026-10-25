# Website performance

## Changes

- Public information pages use Next.js prerendering/ISR: 60-second revalidation for the homepage, programme, team, venue and contact pages; 30 seconds on the competition overview because of the upstream catalogue. Published workshop/talk detail pages are prerendered and new IDs can render on demand.
- Published CMS reads use a tagged data cache. Content create/edit/archive/restore and settings API writes invalidate that tag with expire: 0 immediately after the successful transaction. Private admin data is never cached here. Fallback seed data is outside the data cache, so a database outage does not become the cached CMS source.
- The public partner catalogue is reused for 30 seconds on browse pages. Registration POST continues to fetch the live catalogue and recheck registration status, fees and team sizes. Workshop/talk POST still locks and checks current database records. Registration forms and all submission/authentication APIs remain dynamic and use no-store responses.
- ContentImage produces responsive Next.js image variants for local public photos, posters, avatars, logos and immutable CMS media. Small logos and fixed-width team cards have explicit sizes. Remote CMS images remain direct browser URLs rather than an unrestricted server proxy. Image optimizer sources are restricted to /images, /brand and /api/media; private admin/receipt routes and arbitrary external origins are rejected.
- Existing explicit responsive 8K campus image sources are retained. Layout containers keep their original crop and aspect rules; image elements have dimensions and asynchronous decoding. The hero is eager/high-priority; offscreen images remain lazy.
- The homepage and informational views render on the server. Interactive counters, competition filters, contact FAQ/forms, navigation and team dragging retain client components. Route pages import their own views directly so unrelated form/filter code does not enter every page bundle. Public client props exclude unused record groups.
- Manrope is delivered as WOFF2 (53,632 bytes instead of a 164,700-byte TTF). Two unused Neue Machina preloads were removed; existing CSS uses Manrope. The headline is no longer hidden behind its entrance animation.
- The team marquee retains continuous visible movement and swipe/drag controls, but stops requesting animation frames offscreen, in hidden tabs or for reduced motion. Header scroll progress uses cached document dimensions instead of rereading layout on each scroll frame.
- Redis is loaded only when a protected rate-limit check runs, avoiding eager client-library initialization for public read paths.

## Measurements and limits

Baseline measurements and image samples are in ignored test-results files. The original Career Pro poster was 2,610,186 bytes; its 768px WebP response measured 57,158 bytes. The YOTA source logo was 1,351,413 bytes; the 256px WebP response measured 23,010 bytes. A 3,024×4,032 CMS portrait was 895,034 bytes; its 640px WebP response measured 43,508 bytes. These are selected image samples, not a claim about total initial-page transfer or a Lighthouse score.

Local production timing is useful for checking cache behavior, but cannot be compared directly with internet response timing. Use the live after-deployment measurements from the same client for a before/after comparison. Run node scripts/audit-performance.mjs and node scripts/audit-live-seo.mjs. PERFORMANCE_ORIGIN can target an isolated local production server. The script performs public reads and confirms unauthenticated private data stays inaccessible; it never creates registrations or sends mail.

The Google PageSpeed API returned a quota-exceeded response during the initial audit, and local browser access was disabled. No Lighthouse score or field Core Web Vitals improvement is claimed without actual browser/field measurements.

## Operational notes

The application currently uses the non-Cache-Components routing model. unstable_cache remains supported for that model; switching the entire app to use cache/Cache Components is a separate migration because existing force-dynamic registration/auth routes would need adaptation. The two-argument revalidateTag API is used, avoiding its deprecated single-argument form.

Admin uploads get new immutable media IDs, so changing a member photo changes the optimized image source automatically. Do not overwrite an existing public media ID. Static files should use a new filename when their content changes. Next.js/Vercel manage optimized-image, hashed-font, CSS and JavaScript asset caches; no service worker caches private or registration responses.

If content is changed through a direct database maintenance script rather than the admin API, cached public pages refresh on their short ISR interval. All authoritative registration validation bypasses browse caches. Keep those boundaries when adding new endpoints.
