import assert from "node:assert/strict";
const origin = process.env.SEO_AUDIT_ORIGIN || "https://cyepreeventbuic.com";
const canonicalOrigin = "https://cyepreeventbuic.com";
async function get(path, redirect = "follow") {
  const r = await fetch(origin + path, { headers: { "User-Agent": "Googlebot" }, redirect });
  return { r, html: await r.text() };
}
function meta(html, key) {
  return [...html.matchAll(/<meta\b[^>]*>/g)].map(m => m[0]).find(tag => tag.includes('name="' + key + '"') || tag.includes('property="' + key + '"'))?.match(/content="([^"]*)"/)?.[1];
}
function schemas(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
}
const { r: sitemapResponse, html: sitemap } = await get("/sitemap.xml");
assert.equal(sitemapResponse.status, 200);
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert(urls.length >= 8);
assert.equal(new Set(urls).size, urls.length);
assert(urls.every(u => u.startsWith(canonicalOrigin + "/") && !/admin|register|api\//.test(u)));
const titles = new Set();
await Promise.all(urls.map(async url => {
  const path = new URL(url).pathname;
  const { r, html } = await get(path);
  assert.equal(r.status, 200, path);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  assert(title && !titles.has(title), "Unique title: " + path); titles.add(title);
  assert(meta(html, "description"), "Description: " + path);
  assert(!meta(html, "robots")?.includes("noindex"), "Public indexing: " + path);
  const canonical = [...html.matchAll(/<link\b[^>]*>/g)].map(m => m[0]).find(t => t.includes('rel="canonical"'))?.match(/href="([^"]*)"/)?.[1];
  assert.equal(new URL(canonical).href, new URL(url).href, path);
  assert.equal(new URL(meta(html, "og:url")).href, new URL(url).href);
  assert.equal(meta(html, "twitter:card"), "summary_large_image");
  assert.equal((html.match(/<h1\b/g) || []).length, 1, "One primary heading: " + path);
  const graph = schemas(html).flatMap(s => s["@graph"] || [s]);
  assert(graph.some(s => s["@type"] === "Organization"));
  if(path.startsWith("/conferences/")) {
    const event = graph.find(s => s["@type"] === "Event");
    assert(event, "Event data: " + path);
    assert.equal(event.url, url);
    assert(event.startDate.endsWith("+05:00"));
    assert.equal(event.offers.priceCurrency, "PKR");
    assert(graph.some(s => s["@type"] === "BreadcrumbList"));
  }
  console.log("PASS", path, title);
}));
const robots = await get("/robots.txt"); assert.equal(robots.r.status, 200); assert(robots.html.includes(canonicalOrigin + "/sitemap.xml"));
const image = await get("/brand/cye-social.png"); assert.equal(image.r.status, 200); assert(image.r.headers.get("content-type").includes("image/png"));
for (const path of ["/register?kind=conference", "/competition-registration/contest-4", "/admin", "/admin/competition-registrations"]) {
  const { r, html } = await get(path);
  assert.equal(r.status, 200, path);
  assert((meta(html, "robots") || r.headers.get("x-robots-tag") || "").includes("noindex"), path);
  console.log("PASS noindex", path);
}
const api = await get("/api/admin/data"); assert.equal(api.r.status, 401); assert(api.r.headers.get("x-robots-tag").includes("noindex"));
const missing = await get("/conferences/nonexistent-session-seo-check"); assert.equal(missing.r.status, 404); assert(meta(missing.html, "robots").includes("noindex"));
const legacy = await get("/competition-registration", "manual"); assert([307, 308].includes(legacy.r.status)); assert(legacy.r.headers.get("location").endsWith("/competitions"));
const home = await get("/"); for (const url of urls.filter(u => new URL(u).pathname.startsWith("/conferences/"))) assert(home.html.includes(new URL(url).pathname));
console.log("Passed live SEO audit: " + urls.length + " public pages, sitemap, robots, share image, noindex forms/admin/API, 404 and redirect.");
