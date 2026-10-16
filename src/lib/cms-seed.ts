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
  about_description: "Capital Youth Expo brings together Pakistan’s next generation of thinkers, makers, and changemakers. Organized by Al Nakhla Student Support Centre and Youth Insight Pakistan, our Bahria University pre-event connects ambitious young people through technology, creativity, competition, and conversation.",
  contact_email: "cye.buic@gmail.com",
  contact_phone: "",
  registration_open: false,
  instagram_url: "",
  linkedin_url: "",
  maps_url: "https://maps.google.com/?q=Bahria+University+Islamabad+Campus",
};

export function blankRecord(kind: ContentKind): ContentRecord {
  return { id: "", kind, title: "", subtitle: "", description: "", image_url: "", category: "", date: "2026-10-01", time: "", location: "Bahria University, Islamabad", fee: 0, min_members: 1, max_members: 1, capacity: 0, rules: "", speaker_ids: [], featured: false, published: true, sort_order: 0, deleted_at: null };
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
  entry("conferences", "cye-nexus", { title: "CYE Nexus", subtitle: "Ideas that move us forward.", description: "A day of fresh perspectives on AI, entrepreneurship, design, and the future of work. Join conversations that go beyond the stage.", category: "Conference", time: "10:00 – 16:00", image_url: "/images/auditorium.webp", capacity: 300, featured: true }),
  entry("conferences", "career-pro", { title: "Career Pro Talks", subtitle: "Your next chapter starts here.", description: "Connect with professionals, ask the questions that matter, and discover new pathways from campus to career.", category: "Career & leadership", time: "11:30 – 14:00", image_url: "/images/recap3.webp", capacity: 150, sort_order: 1 }),
  ...[
    ["Speed Programming", "Technology", "Think fast. Code faster.", "Solve algorithmic challenges against the clock. Put your problem-solving skills to the test.", 2, "2.5 hours", "C++, Python 3, Java, and C# permitted.\nOriginal submissions only.\nEvaluation considers correctness, efficiency, and submission time."],
    ["Mini Hackathon", "Technology", "Make something that matters.", "Turn a real-world problem into a working prototype and pitch your idea to the judges.", 4, "6 hours", "Teams of 2–4 participants.\nBuild an original prototype during the event.\nPresent your solution and its impact to the judges."],
    ["Counter-Strike 2", "Esports", "Bring your A-game.", "Form your squad and step into the arena for a competitive LAN tournament.", 5, "Tournament", "Five participants per team.\nBring your own permitted peripherals.\nFair play and organizer tournament rules apply."],
    ["Speech Competition", "Literary arts", "A voice worth hearing.", "Take the stage in English or Urdu. Make your argument. Leave your mark.", 1, "5 minutes", "Individual entries in English or Urdu.\nOriginal speeches only.\nRespect the five-minute time limit."],
    ["Seerah Quiz", "Literary arts", "Knowledge with purpose.", "Explore the life and teachings of the Prophet (PBUH) in a thoughtful quiz challenge.", 3, "Quiz rounds", "Teams of up to three.\nNo external reference material during rounds.\nQuizmaster decisions are final."],
    ["Essay Writing", "Literary arts", "Words can change things.", "Share a fresh perspective through thoughtful, original writing.", 1, "90 minutes", "Individual entries only.\nTopic announced at the event.\nOriginal writing is required."],
    ["Short Story Writing", "Literary arts", "Build a world in words.", "Let your imagination lead and create a story that stays with the reader.", 1, "90 minutes", "Individual entries only.\nWrite an original short story within the time limit.\nJudging considers originality, structure, and language."],
    ["Painting & Visual Arts", "Creative arts", "See things differently.", "Translate your perspective into a visual piece that tells its own story.", 1, "2 hours", "Individual entries only.\nBring your own art supplies.\nArtwork must be created at the event."],
  ].map((c, i) => entry("contests", `contest-${i + 1}`, { title: c[0] as string, category: c[1] as string, subtitle: c[2] as string, description: c[3] as string, min_members: i===1?2:i===2?5:1, max_members: c[4] as number, time: c[5] as string, rules: c[6] as string, featured: i < 3, sort_order: i })),
  ...[
    ["Mamoon Ahmed Ali", "Event Head", "Overall event strategy and executive supervision."],
    ["Hamid Sultan", "Deputy Event Head", "Connecting our teams and bringing the event to life."],
    ["Hamza Ali", "Technical Committee Lead", "Technology, coding challenges, and hackathon infrastructure."],
    ["Ayesha Khan", "Literary Secretariat Lead", "Speech, quiz, and literary competition coordination."],
    ["Zaid Ahmed", "Esports Management Lead", "Tournament operations and gaming arena coordination."],
    ["Maham Tariq", "Communications & Media Lead", "Delegate services, photography, and event communications."],
  ].map((t, i) => entry("team", `team-${i + 1}`, { title: t[0], subtitle: t[1], description: t[2], image_url: portraits[i], sort_order: i, featured: i < 3 })),
  entry("sponsors", "al-nakhla", { title: "Al Nakhla", subtitle: "Student Support Centre", image_url: "/images/al-nakhla-logo.png" }),
  entry("sponsors", "youth-insight", { title: "Youth Insight", subtitle: "Pakistan", image_url: "/images/youth-insight.png", sort_order: 1 }),
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
