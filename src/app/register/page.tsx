import { pageMetadata } from "@/lib/seo";
import ExplorePages from "@/components/site/ExplorePages";
import { getPublicContent } from "@/lib/server/content";
import { redirect } from "next/navigation";
import { PARTNER_COMPETITIONS } from "@/lib/partner-competitions";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("Workshop & Talk Registration", "Register for the Career Pro workshop or Purpose of Life talk at Bahria University Islamabad.", "/register?kind=conference", true);

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ kind?: string | string[]; entry?: string | string[] }> }) {
  const [data, query] = await Promise.all([getPublicContent(), searchParams]);
  const kind = query.kind === "conference" ? "conference" : "contest";
  const entry = typeof query.entry === "string" ? query.entry : "";
  if (kind === "contest") redirect(Object.hasOwn(PARTNER_COMPETITIONS, entry) ? `/competition-registration/${entry}` : "/competitions");
  return <ExplorePages view="register" data={data} defaultKind={kind} defaultEntry={entry} />;
}

