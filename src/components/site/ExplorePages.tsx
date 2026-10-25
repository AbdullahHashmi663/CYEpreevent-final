import type { ReactNode } from "react";
import type { SiteSettings } from "@/lib/cms-types";
import SiteShell from "./SiteShell";
import "./explore.css";
export default function ExplorePageShell({ settings, view, children }: { settings: SiteSettings; view: string; children: ReactNode }) {
  return <SiteShell settings={settings}><div className={`explore-page explore-${view}`}>{children}</div></SiteShell>;
}
