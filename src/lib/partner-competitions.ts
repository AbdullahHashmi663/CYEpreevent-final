export const PARTNER_COMPETITIONS = {
  "contest-1": "Speed Programming",
  "contest-2": "Hackathon",
  "pitch-your-idea": "Pitch Your Idea (SparkTank)",
  "reel-competition": "Reel Competition",
  "graphic-design": "Graphic Design",
  "contest-4": "Speech (English / Urdu)",
} as const;
export interface PartnerCompetition {
  localId: string; id: number; name: string; category: string; audience: string;
  fee: string; teamMin: number; teamMax: number; description: string; rulebookUrl: string | null;
}
export interface PartnerCatalogue { registrationOpen: boolean; competitions: PartnerCompetition[] }
export const PARTNER_LEVELS = ["Grade 9", "Grade 10", "Grade 11 (Intermediate Part 1)", "Grade 12 (Intermediate Part 2)", "Undergraduate", "Graduate / Postgraduate", "Other"] as const;
export interface PartnerMember { name: string; email: string; phone: string; institution: string; gender: string }
export interface PartnerRegistration { competition: string; teamName: string; level: string; idNumber: string; consent: boolean; members: PartnerMember[] }
export function validatePartnerRegistration(input: unknown, competition: PartnerCompetition): PartnerRegistration {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Invalid registration details.");
  const data = input as Record<string, unknown>;
  const text = (value: unknown, label: string, max = 160) => {
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw Error(`Enter a valid ${label}.`);
    return value.trim();
  };
  if (!Array.isArray(data.members) || data.members.length < competition.teamMin || data.members.length > competition.teamMax) throw Error(`${competition.name} requires ${competition.teamMin}–${competition.teamMax} participant(s).`);
  if (!PARTNER_LEVELS.includes(data.level as typeof PARTNER_LEVELS[number])) throw Error("Select a valid education level.");
  if (data.consent !== true) throw Error("Accept the competition rules and confirm your details.");
  const members = data.members.map((item, i) => {
    if (!item || typeof item !== "object") throw Error(`Complete participant ${i + 1}.`);
    const m = item as Record<string, unknown>;
    const email = text(m.email, "email address", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error(`Enter a valid email for participant ${i + 1}.`);
    if (m.gender !== "Male" && m.gender !== "Female") throw Error(`Select a gender for participant ${i + 1}.`);
    const phone = text(m.phone, "phone number", 35);
    if (!/^\+?[\d\s()-]{7,35}$/.test(phone)) throw Error(`Enter a valid phone for participant ${i + 1}.`);
    return { name: text(m.name, "full name"), email, phone, institution: text(m.institution, "institution"), gender: m.gender };
  });
  if (new Set(members.map(m => m.email)).size !== members.length) throw Error("Use a different email address for each participant.");
  return { competition: competition.name, teamName: members.length > 1 ? text(data.teamName, "team name") : "", level: data.level as string, idNumber: text(data.idNumber, "team lead’s CNIC, Student ID or B-Form number", 80), consent: true, members };
}
