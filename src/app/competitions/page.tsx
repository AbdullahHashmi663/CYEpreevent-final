import type { Metadata } from "next";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";
import { getPartnerCatalogue } from "@/lib/server/partner";
import type { PartnerCatalogue } from "@/lib/partner-competitions";
import { COMPETITION_RULEBOOKS } from "@/lib/competition-rulebooks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Competitions", description: "Explore Tech Nexus, Venture X, Spectrum, and Literary at Capital Youth Expo pre-event: programming, hackathon, pitching, reels, graphic design, and speech." };

export default async function Page() {
  const data = await getPublicContent();
  let catalogue: PartnerCatalogue | undefined;
  try { catalogue = await getPartnerCatalogue(); } catch { /* Dedicated forms show a retry state when the partner is unavailable. */ }
  const contests = data.contests.map(contest => {
    const partner = catalogue?.competitions.find(c => c.localId === contest.id);
    return { ...contest, fee: partner ? Number(partner.fee.replace(/[^\d.]/g,"")) : 0, min_members: partner?.teamMin || contest.min_members, max_members: partner?.teamMax || contest.max_members, rules: COMPETITION_RULEBOOKS[contest.id]?.summary || contest.rules, date: "2026-11-18", location: "Pak-China Friendship Center, Islamabad" };
  });
  return <ExplorePages view="competitions" data={{...data, contests}} />;
}
