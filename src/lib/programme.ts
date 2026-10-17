import type { ContentRecord } from "./cms-types";

export const COMPETITION_SECTIONS = [
  { name: "Tech Nexus", slug: "tech-nexus", description: "Think fast. Build something that matters.", events: "Speed Programming · Hackathon" },
  { name: "Venture X", slug: "venture-x", description: "Give your next big idea a stage.", events: "Pitch Your Idea" },
  { name: "Spectrum", slug: "spectrum", description: "Make your creativity impossible to miss.", events: "Reel Competition · Graphic Design" },
  { name: "Literary", slug: "literary", description: "Your voice. Your perspective. Your moment.", events: "Speech" },
] as const;
export const CONFERENCE_SECTIONS = [
  { name: "Career Pro", slug: "career-pro-workshop", description: "A workshop for your next step, from campus to career.", events: "Workshop" },
  { name: "Talk", slug: "talk", description: "Fresh perspectives and a conversation worth having.", events: "Talk" },
] as const;

export function programmeSection(entry: Pick<ContentRecord, "kind" | "category" | "title">): string {
  const category = entry.category.trim();
  if (entry.kind === "conferences") {
    if (category === "Career Pro" || category === "Talk") return category;
    if (/career|workshop/i.test(`${category} ${entry.title}`)) return "Career Pro";
    return "Talk";
  }
  if (COMPETITION_SECTIONS.some(section => section.name === category)) return category;
  if (/programming|hackathon/i.test(entry.title) || /tech/i.test(category)) return "Tech Nexus";
  if (/pitch|venture/i.test(`${entry.title} ${category}`)) return "Venture X";
  if (/reel|graphic/i.test(entry.title) || /creative|art/i.test(category) && !/literary/i.test(category)) return "Spectrum";
  if (/speech|literary/i.test(`${entry.title} ${category}`)) return "Literary";
  return category || "More competitions";
}

export function requiresPayment(entry: Pick<ContentRecord, "kind" | "category" | "title">): boolean {
  return entry.kind === "contests" || (entry.kind === "conferences" && programmeSection(entry) === "Career Pro");
}

export function programmeGroups(entries: ContentRecord[], kind: "contests" | "conferences") {
  const sections = kind === "contests" ? COMPETITION_SECTIONS : CONFERENCE_SECTIONS;
  const names = [...sections.map(section => section.name as string), ...new Set(entries.map(programmeSection))];
  return [...new Set(names)].map(name => ({
    name,
    slug: sections.find(section => section.name === name)?.slug || `section-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    description: sections.find(section => section.name === name)?.description || "Explore the published competition lineup.",
    entries: entries.filter(entry => programmeSection(entry) === name),
  }));
}
