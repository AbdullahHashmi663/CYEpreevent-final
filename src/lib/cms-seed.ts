import type { ContentKind, ContentRecord, PublicContent, SiteSettings } from "./cms-types";

export const DEFAULT_SETTINGS: SiteSettings = {
  event_name: "Capital Youth Expo",
  event_date: "2026-10-01",
  date_label: "01 October 2026",
  venue: "Bahria University, Islamabad",
  venue_address: "Shangrilla Road, Sector E-8, Islamabad, Pakistan",
  hero_title: "THE FUTURE",
  hero_accent: "IS OURS.",
  hero_description: "Big ideas. Real connections. A generation ready to build what comes next. Meet your people at Capital Youth Expo.",
  hero_image: "/images/recap1.webp",
  about_description: "Capital Youth Expo brings together Pakistan’s next generation of thinkers, makers, and changemakers. Organized by Al Nakhla, the Student Support Centre at Bahria University Islamabad, and Youth Insight Pakistan, our Bahria University pre-event connects ambitious young people through technology, creativity, competition, and conversation.",
  contact_email: "cye.buic@gmail.com",
  contact_phone: "",
  registration_open: false,
  instagram_url: "",
  linkedin_url: "",
  maps_url: "https://maps.google.com/?q=Bahria+University+Islamabad+Campus",
};

export function blankRecord(kind: ContentKind): ContentRecord {
  return { id: "", kind, title: "", subtitle: "", description: "", image_url: "", category: kind === "contests" ? "Tech Nexus" : kind === "conferences" ? "Talk" : "", date: "2026-10-01", time: "", location: "Bahria University, Islamabad", fee: 0, min_members: 1, max_members: 1, capacity: 0, rules: "", speaker_ids: [], featured: false, published: true, sort_order: 0, deleted_at: null };
}
function entry(kind: ContentKind, id: string, data: Partial<ContentRecord>): ContentRecord {
  return { ...blankRecord(kind), id, ...data };
}
const portraits = [
  "/images/members/WhatsApp Image 2026-08-24 at 12.10.44 PM (1).jpeg",
  "/images/members/WhatsApp Image 2026-08-24 at 12.10.46 PM (1).jpeg",
  "/images/members/WhatsApp Image 2026-08-24 at 12.10.44 PM.jpeg",
  "/images/members/WhatsApp Image 2026-08-24 at 12.10.43 PM.jpeg",
  "/images/members/WhatsApp Image 2026-08-24 at 12.10.44 PM (2).jpeg",
  "/images/members/WhatsApp Image 2026-08-24 at 12.10.45 PM.jpeg",
];
export const SEED_CONTENT: ContentRecord[] = [
  entry("conferences", "career-pro", { title: "Career Pro Workshop", subtitle: "Your next chapter starts here.", description: "Build practical career skills, connect with professionals, and explore your next step from campus to career.", category: "Career Pro", time: "Schedule to be announced", image_url: "/images/recap3.webp", capacity: 150, featured: true }),
  entry("conferences", "cye-nexus", { title: "Talk", subtitle: "Ideas that move us forward.", description: "Join a conversation that brings fresh perspectives and new possibilities. The topic and speaker will be announced by the organizers.", category: "Talk", time: "Schedule to be announced", image_url: "/images/auditorium.webp", capacity: 300, sort_order: 1 }),
  ...[
    ["contest-1", "Speed Programming", "Tech Nexus", "Think fast. Code faster.", "Solve algorithmic challenges against the clock. Put your problem-solving skills to the test.", 2, "2.5 hours", "Original submissions only.\nEvaluation considers correctness, efficiency, and submission time."],
    ["contest-2", "Hackathon", "Tech Nexus", "Make something that matters.", "Turn a real-world problem into a working prototype and present your solution.", 4, "6 hours", "Teams of 2–4 participants.\nBuild an original prototype during the event."],
    ["pitch-your-idea", "Pitch Your Idea", "Venture X", "Big ideas start with you.", "Share an original venture idea and explain the problem it solves.", 1, "To be announced", ""],
    ["reel-competition", "Reel Competition", "Spectrum", "Tell a story in a moment.", "Bring your perspective to life through a creative short-form video.", 1, "To be announced", ""],
    ["graphic-design", "Graphic Design", "Spectrum", "Make your ideas visible.", "Use visual storytelling and thoughtful design to make your mark.", 1, "To be announced", ""],
    ["contest-4", "Speech", "Literary", "A voice worth hearing.", "Take the stage and share a perspective that stays with your audience.", 1, "5 minutes", "Original speeches only.\nRespect the announced time limit."],
  ].map((c, i) => entry("contests", c[0] as string, { title: c[1] as string, category: c[2] as string, subtitle: c[3] as string, description: c[4] as string, min_members: i === 1 ? 2 : 1, max_members: c[5] as number, time: c[6] as string, rules: c[7] as string, featured: i < 3, sort_order: i })),
  ...[
    ["Mamoon Ahmed Ali", "Event Head", "Overall event strategy and executive supervision."],
    ["Hamid Sultan", "Deputy Event Head", "Connecting our teams and bringing the event to life."],
    ["Hamza Ali", "Technical Committee Lead", "Technology, coding challenges, and hackathon infrastructure."],
    ["Ayesha Khan", "Literary Secretariat Lead", "Speech, quiz, and literary competition coordination."],
    ["Zaid Ahmed", "Esports Management Lead", "Tournament operations and gaming arena coordination."],
    ["Maham Tariq", "Communications & Media Lead", "Delegate services, photography, and event communications."],
  ].map((t, i) => entry("team", `team-${i + 1}`, { title: t[0], subtitle: t[1], description: t[2], image_url: portraits[i], sort_order: i, featured: i < 3 })),
  entry("sponsors", "al-nakhla", { title: "Al Nakhla", subtitle: "", description: "Overall management of the pre-event.", image_url: "/images/al-nakhla-logo.png" }),
  entry("sponsors", "bahria-ssc", { title: "Student Support Centre", subtitle: "Bahria University, Islamabad", description: "Support partner.", image_url: "/images/bahria-ssc-logo.jpg", sort_order: 1 }),
  entry("sponsors", "youth-insight", { title: "Youth Insight", subtitle: "Pakistan", description: "Community outreach and promotions.", image_url: "/images/youth-insight.png", sort_order: 2 }),
  entry("sponsors", "yota", { title: "YOTA", subtitle: "Youth Organization for Technical Advancements", description: "Overall coordination of the expo’s technical modules.", image_url: "/images/yota-logo.png", sort_order: 3 }),
];
// Retain the supplied event date. Past events stay closed until an admin updates the date and opens registration.
// Existing speaker names were paired with unrelated team portraits, so speakers are published by the admin after verification.
export function fallbackContent(): PublicContent {
  return {
    settings: DEFAULT_SETTINGS,
    conferences: SEED_CONTENT.filter(r => r.kind === "conferences"),
    speakers: SEED_CONTENT.filter(r => r.kind === "speakers"),
    team: SEED_CONTENT.filter(r => r.kind === "team"),
    contests: SEED_CONTENT.filter(r => r.kind === "contests"),
    sponsors: SEED_CONTENT.filter(r => r.kind === "sponsors"),
    databaseAvailable: false,
  };
}
