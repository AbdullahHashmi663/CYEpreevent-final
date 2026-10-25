import Link from "next/link";
import type { PublicContent } from "@/lib/cms-types";
import { PageIntro } from "../SiteShell";
import ApplicationForm from "../ApplicationForm";

export default function Register({ data, defaultKind, defaultEntry }: { data: PublicContent; defaultKind?: "contest" | "conference"; defaultEntry?: string }) {
  return <>
    <PageIntro eyebrow="Your next move starts here" title="TAKE YOUR" accent="PLACE." description="Register for the workshop or free talk. One participant per registration." />
    <section className="container explore-section form-layout"><div className="form-sidebar"><span className="eyebrow">An experience worth joining</span><h2>One application.<br />New possibilities.</h2><p>Choose the Career Pro workshop or Purpose of Life talk and send your details to the BUIC organizing team. Competitions have separate registration forms and payment accounts.</p><div className="registration-steps"><div><span>01</span><p><strong>Choose your experience</strong>Pick the workshop or talk.</p></div><div><span>02</span><p><strong>Add your people</strong>Enter your details. Each session entry is for one participant.</p></div><div><span>03</span><p><strong>Keep your reference</strong>Your application goes to the team for review.</p></div></div><div className="form-sidebar-note"><span className="eyebrow">A little help?</span><p>Read the <Link href="/competitions">competition rules</Link> or <Link href="/contact">talk to our team</Link> before applying.</p></div></div><ApplicationForm data={{...data, team: [], speakers: [], sponsors: [], contests: []}} mode="registration" defaultKind={defaultKind} defaultEntry={defaultEntry} /></section>
  </>;
}
