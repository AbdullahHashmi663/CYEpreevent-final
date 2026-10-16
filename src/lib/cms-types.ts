export const CONTENT_KINDS = ["conferences", "speakers", "team", "contests", "sponsors"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];
export interface ContentRecord {
  id: string;
  kind: ContentKind;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  category: string;
  date: string;
  time: string;
  location: string;
  fee: number;
  max_members: number;
  min_members: number;
  capacity: number;
  rules: string;
  speaker_ids: string[];
  featured: boolean;
  published: boolean;
  sort_order: number;
  deleted_at: string | null;
}
export interface SiteSettings {
  event_name: string;
  event_date: string;
  date_label: string;
  venue: string;
  venue_address: string;
  hero_title: string;
  hero_accent: string;
  hero_description: string;
  hero_image: string;
  about_description: string;
  contact_email: string;
  contact_phone: string;
  registration_open: boolean;
  instagram_url: string;
  linkedin_url: string;
  maps_url: string;
}
export interface PublicContent {
  settings: SiteSettings;
  conferences: ContentRecord[];
  speakers: ContentRecord[];
  team: ContentRecord[];
  contests: ContentRecord[];
  sponsors: ContentRecord[];
  databaseAvailable: boolean;
}
export type ApplicationKind = "contest" | "conference" | "ambassador" | "contact";
export interface TeamParticipant { name: string; email: string; phone: string; university: string }
export interface ApplicationPayload {
  kind: ApplicationKind;
  entry_id?: string;
  name: string;
  email: string;
  phone?: string;
  university?: string;
  message?: string;
  department?: string;
  semester?: string;
  team_members?: TeamParticipant[];
  website?: string;
}
export interface ApplicationRecord extends ApplicationPayload {
  id: string;
  reference: string;
  entry_title: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string;
  deleted_at: string | null;
  created_at: string;
}
export interface AdminUser { id: string; email: string; must_change_password: boolean }
export interface AuditRecord { id: string; action: string; target_id: string; admin_email: string; created_at: string }
export interface AdminData { settings: SiteSettings; content: ContentRecord[]; applications: ApplicationRecord[]; audit: AuditRecord[]; user: AdminUser }
