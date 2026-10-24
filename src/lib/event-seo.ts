import type { ContentRecord, PublicContent } from "./cms-types";
import { absoluteUrl, SITE_URL, SITE_NAME } from "./seo";
import { requiresPayment } from "./programme";
export function sessionStructuredData(entry: ContentRecord, data: PublicContent) {
  const path = "/conferences/" + encodeURIComponent(entry.id);
  const breadcrumb = { "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: "Workshops & Talks", item: absoluteUrl("/conferences") },
    { "@type": "ListItem", position: 3, name: entry.title, item: absoluteUrl(path) },
  ] };
  const graph: Record<string, unknown>[] = [breadcrumb];
  const times = entry.time.match(/^(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})$/);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && !Number.isNaN(Date.parse(entry.date));
  // Do not advertise fallback seed dates, invented times or unavailable fee data.
  if (data.databaseAvailable && validDate) {
    const start = times && Number(times[1]) < 24 && Number(times[2]) < 60 ? entry.date + "T" + times[1].padStart(2, "0") + ":" + times[2] + ":00+05:00" : entry.date;
    const end = times && Number(times[3]) < 24 && Number(times[4]) < 60 ? entry.date + "T" + times[3].padStart(2, "0") + ":" + times[4] + ":00+05:00" : undefined;
    graph.push({
      "@type": "Event", "@id": absoluteUrl(path) + "#event", name: entry.title,
      description: entry.description || entry.subtitle, url: absoluteUrl(path), startDate: start, ...(end ? { endDate: end } : {}),
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      ...(entry.image_url ? { image: [absoluteUrl(entry.image_url)] } : {}),
      location: { "@type": "Place", name: entry.location || data.settings.venue, address: { "@type": "PostalAddress", streetAddress: data.settings.venue_address, addressLocality: "Islamabad", addressCountry: "PK" } },
      organizer: { "@type": "Organization", "@id": SITE_URL + "/#organization", name: SITE_NAME, url: SITE_URL },
      performer: data.speakers.filter(s => entry.speaker_ids.includes(s.id)).map(s => ({ "@type": "Person", name: s.title })),
      ...(!requiresPayment(entry) || entry.fee > 0 ? { offers: { "@type": "Offer", url: absoluteUrl("/register?kind=conference&entry=" + encodeURIComponent(entry.id)), price: requiresPayment(entry) ? entry.fee : 0, priceCurrency: "PKR" } } : {}),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
