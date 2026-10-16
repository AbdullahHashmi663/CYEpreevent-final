import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SiteShell, { PageIntro } from "@/components/site/SiteShell";
import { getPublicContent } from "@/lib/server/content";

export default async function NotFound() {
  const { settings } = await getPublicContent();
  return <SiteShell settings={settings}><PageIntro eyebrow="404 / A different direction" title="A LITTLE" accent="OFF TRACK." description="This page has moved or isn’t available. There’s still plenty to discover at the expo."/><div className="container" style={{ paddingBottom: 80 }}><Link href="/" className="button button-primary">Back to the expo<ArrowUpRight size={18}/></Link></div></SiteShell>;
}
