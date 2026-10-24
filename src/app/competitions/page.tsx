import { pageMetadata, PUBLIC_PAGES } from "@/lib/seo";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";
import { getPartnerCatalogue } from "@/lib/server/partner";
import type { PartnerCatalogue } from "@/lib/partner-competitions";
import { COMPETITION_RULEBOOKS } from "@/lib/competition-rulebooks";

export const dynamic = "force-dynamic";
const seo = PUBLIC_PAGES[2];
export const metadata = pageMetadata(seo.title, seo.description, seo.path);

export default async function Page() {
  const data = await getPublicContent();
  let catalogue: PartnerCatalogue | undefined;
  try { catalogue = await getPartnerCatalogue(); } catch { /* Dedicated forms show a retry state when the partner is unavailable. */ }
  const contests = data.contests.map(contest => {
    const partner = catalogue?.competitions.find(c => c.localId === contest.id);
    return { ...contest, fee: partner ? Number(partner.fee.replace(/[^\d.]/g,"")) : 0, min_members: partner?.teamMin || contest.min_members, max_members: partner?.teamMax || contest.max_members, time: COMPETITION_RULEBOOKS[contest.id]?.duration || contest.time, rules: COMPETITION_RULEBOOKS[contest.id]?.summary || contest.rules, date: "2026-11-18", location: "Pak-China Friendship Center, Islamabad" };
  });
  return <ExplorePages view="competitions" data={{...data, contests}} />;
}
