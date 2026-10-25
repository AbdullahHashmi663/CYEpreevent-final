import "server-only";
import { unstable_cache } from "next/cache";
import { COMPETITION_RULEBOOKS } from "@/lib/competition-rulebooks";
import { PARTNER_COMPETITIONS, type PartnerCatalogue, type PartnerCompetition } from "@/lib/partner-competitions";
import { fail } from "./http";
const BASE = "https://www.capitalyouthexpo.com/api/partner/v1";
export async function partnerRequest(path: string, init: RequestInit = {}) {
  const key = process.env.CYE_PARTNER_API_KEY;
  if (!key) fail(503, "Competition registration is temporarily unavailable. Please contact the team.");
  return fetch(`${BASE}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${key}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(init.method === "POST" ? 55000 : 15000) });
}
export async function getPartnerCatalogue(): Promise<PartnerCatalogue> {
  const res = await partnerRequest("/competitions");
  if (!res.ok) fail(503, "The competition service is temporarily unavailable. Please try again later.");
  const data = await res.json();
  if (!Array.isArray(data.competitions) || typeof data.registrationOpen !== "boolean") fail(503, "The competition service returned an invalid response.");
  const competitions = Object.entries(PARTNER_COMPETITIONS).flatMap(([localId, name]) => {
    const c = data.competitions.find((item: PartnerCompetition) => item.name === name);
    if (!c || !Number.isInteger(c.teamMin) || !Number.isInteger(c.teamMax) || c.teamMin < 1 || c.teamMax < c.teamMin || c.teamMax > 20 || typeof c.fee !== "string") return [];
    return [{ ...c, localId, rulebookUrl: COMPETITION_RULEBOOKS[localId]?.url ?? null }];
  });
  return { registrationOpen: data.registrationOpen, competitions };
}

// Browse pages can reuse the public catalogue; submission always calls the fresh function above.
export const getBrowsePartnerCatalogue = unstable_cache(getPartnerCatalogue, ["cye-partner-browse-v1"], { revalidate: 30 });
