import "server-only";
import { CONTENT_KINDS, type ApplicationKind, type ApplicationPayload, type ContentRecord, type SiteSettings } from "@/lib/cms-types";
import { fail } from "./http";
import { requiresPayment } from "@/lib/programme";

export function text(value: unknown, label: string, max = 1000, required = false): string {
  if (value === undefined || value === null) { if (required) fail(400, `${label} is required.`); return ""; }
  if (typeof value !== "string") fail(400, `${label} must be text.`);
  const clean = value.trim();
  if (clean.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(clean)) fail(400, `${label} is too long or contains invalid characters.`);
  if (required && !clean) fail(400, `${label} is required.`);
  return clean;
}
export function email(value: unknown): string {
  const valueText = text(value, "Email", 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueText)) fail(400, "Please enter a valid email address.");
  return valueText;
}
function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) fail(400, `${label} must be a whole number between ${min} and ${max}.`);
  return value;
}
function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(400, `${label} must be true or false.`);
  return value;
}
export function date(value: unknown, label: string, required = false): string {
  const result = text(value, label, 10, required);
  if (result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(result)) || new Date(result).toISOString().slice(0,10) !== result)) fail(400, `${label} must be a valid date.`);
  return result;
}
function url(value: unknown, label: string, images = false) {
  const result = text(value, label, 1500);
  if (!result) return result;
  if (images && /^\/(images\/|api\/media\/)/.test(result) && !/[\x00-\x1f\x7f]/.test(result) && !result.includes("..") && !result.includes("\\")) return result;
  try { const parsed = new URL(result); if (parsed.protocol === "https:" && !parsed.username && !parsed.password) return result; } catch {}
  fail(400, `${label} must be a secure HTTPS link${images ? " or a website image path" : ""}.`);
}
export function validateContent(input: Record<string, unknown>, existing?: ContentRecord): ContentRecord {
  const data = { ...existing, ...input };
  if (!CONTENT_KINDS.includes(data.kind as ContentRecord["kind"])) fail(400, "Please select a valid content type.");
  const kind = data.kind as ContentRecord["kind"];
  const id = text(data.id, "Record ID", 100);
  if (id && !/^[a-zA-Z0-9_-]+$/.test(id)) fail(400, "Invalid record ID.");
  if (existing && (id !== existing.id || kind !== existing.kind)) fail(400, "The content type and record ID cannot be changed.");
  if (!Array.isArray(data.speaker_ids) || data.speaker_ids.length > 30 || data.speaker_ids.some(v => typeof v !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(v))) fail(400, "Invalid speaker selection.");
  if (typeof data.fee !== "number" || !Number.isFinite(data.fee) || data.fee < 0 || data.fee > 1000000) fail(400, "Fee must be between 0 and 1,000,000.");
  if (kind === "contests" && data.fee < 0.01) fail(400, "Set a competition entry fee greater than zero.");
  const category = text(data.category, "Category", 100);
  const title = text(data.title, "Title", 160, true);
  if (kind === "conferences" && requiresPayment({ kind, category, title }) && data.fee < 0.01) fail(400, "Set a Career Pro workshop fee greater than zero.");
  if (kind === "conferences" && !requiresPayment({ kind, category, title }) && data.fee !== 0) fail(400, "The Talk is free. Set its entry fee to zero.");
  const minimum = integer(data.min_members ?? 1, "Minimum team size", 1, 20);
  const maximum = integer(data.max_members, "Maximum team size", 1, 20);
  if (minimum > maximum) fail(400, "Minimum team size cannot be greater than maximum team size.");
  return {
    id, kind, title: text(data.title, "Title", 160, true), subtitle: text(data.subtitle, "Subtitle", 220),
    description: text(data.description, "Description", 10000), image_url: url(data.image_url, "Image", true),
    ...(kind === "team" ? {
      use_avatar: data.use_avatar === undefined ? false : boolean(data.use_avatar, "Use avatar"),
      avatar_style: data.avatar_style === undefined ? "beard" as const : data.avatar_style === "scarf" || data.avatar_style === "beard" ? data.avatar_style : fail(400, "Choose the scarf or beard avatar."),
    } : {}),
    category, date: date(data.date, "Date"),
    time: text(data.time, "Time", 100), location: text(data.location, "Location", 240),
    fee: data.fee, payment_instructions: text(data.payment_instructions, "Payment instructions", 3000), min_members: kind === "conferences" ? 1 : minimum, max_members: kind === "conferences" ? 1 : maximum,
    payment_method: text(data.payment_method, "Payment method", 100),
    payment_account_name: text(data.payment_account_name, "Account holder name", 160),
    payment_account_number: text(data.payment_account_number, "Payment account number", 100),
    capacity: integer(data.capacity, "Capacity", 0, 100000), rules: text(data.rules, "Rules", 15000),
    speaker_ids: [...new Set(data.speaker_ids as string[])], featured: boolean(data.featured, "Featured"),
    published: boolean(data.published, "Published"), sort_order: integer(data.sort_order, "Display order", 0, 100000),
    deleted_at: existing?.deleted_at || null,
  };
}
export function validateSettings(input: Record<string, unknown>): SiteSettings {
  return {
    event_name: text(input.event_name, "Event name", 100, true), event_date: date(input.event_date, "Event date", true),
    date_label: text(input.date_label, "Date label", 100, true), venue: text(input.venue, "Venue", 200, true),
    venue_address: text(input.venue_address, "Venue address", 300), hero_title: text(input.hero_title, "Hero title", 100, true),
    hero_accent: text(input.hero_accent, "Hero accent", 100), hero_description: text(input.hero_description, "Hero description", 1000),
    hero_image: url(input.hero_image, "Hero image", true), about_description: text(input.about_description, "About description", 10000),
    contact_email: email(input.contact_email), contact_phone: text(input.contact_phone, "Phone", 50),
    registration_open: boolean(input.registration_open, "Registration status"), instagram_url: url(input.instagram_url, "Instagram"),
    linkedin_url: url(input.linkedin_url, "LinkedIn"), maps_url: url(input.maps_url, "Map"),
  };
}
export function validateApplication(input: Record<string, unknown>): ApplicationPayload {
  const kind = input.kind as ApplicationKind;
  if (!["contest", "conference", "contact"].includes(kind)) fail(400, "Please select a valid application type.");
  if (text(input.website, "Website", 200)) fail(400, "Unable to accept this submission.");
  const members = input.team_members === undefined ? [] : input.team_members;
  if (!Array.isArray(members) || members.length > 19) fail(400, "Invalid team member list.");
  if (kind !== "contest" && members.length) fail(400, "Team members are only accepted for contests.");
  const payload: ApplicationPayload = {
    kind, name: text(input.name, "Full name", 120, true), email: email(input.email),
    phone: text(input.phone, "Phone", 50, kind !== "contact"), university: text(input.university, "University", 200, kind !== "contact"),
    message: text(input.message, "Message", 5000, kind === "contact"),
    team_members: members.map((member: unknown) => {
      if (!member || typeof member !== "object" || Array.isArray(member)) fail(400, "Invalid team member.");
      const record = member as Record<string, unknown>;
      return { name: text(record.name, "Team member name", 120, true), email: email(record.email), phone: text(record.phone, "Team member phone", 50, true), university: text(record.university, "Team member university", 200, true) };
    }),
  };
  if (kind === "contest" || kind === "conference") {
    payload.entry_id = text(input.entry_id, "Event selection", 100, true);
    if (!/^[a-zA-Z0-9_-]+$/.test(payload.entry_id)) fail(400, "Invalid event selection.");
  }
  const emails = [payload.email, ...(payload.team_members || []).map(member => member.email)];
  if (new Set(emails).size !== emails.length) fail(400, "Each team member must have a different email address.");
  return payload;
}
