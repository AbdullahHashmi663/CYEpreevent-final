import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
export const PUBLIC_CONTENT_TAG = "cye-public-content";
import { CONTENT_KINDS, type ApplicationRecord, type ContentRecord, type PublicContent, type SiteSettings } from "@/lib/cms-types";
import { fallbackContent } from "@/lib/cms-seed";
import { database } from "./db";

export function contentRow(row: { id: string; kind: ContentRecord["kind"]; data: ContentRecord; deleted_at: Date | string | null }): ContentRecord {
  return { ...row.data, min_members: row.data.min_members ?? 1, id: row.id, kind: row.kind, deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null };
}
export function applicationRow(row: Record<string, unknown>): ApplicationRecord {
  return {
    ...(row.payload as ApplicationRecord), id: row.id as string, reference: row.reference as string,
    entry_title: (row.entry_title as string) || "", status: row.status as ApplicationRecord["status"],
    rejection_reason: row.rejection_reason as string,
    deleted_at: row.deleted_at ? new Date(row.deleted_at as string).toISOString() : null,
    created_at: new Date(row.created_at as string).toISOString(),
  };
}
// Keep the existing request-time routing model; cache only published data, never private admin data.
const publishedContent = unstable_cache(async (): Promise<PublicContent> => {
    const result = await database().query<{ settings: SiteSettings; content: Parameters<typeof contentRow>[0][] }>(`
      select s.data settings, (select coalesce(jsonb_agg(to_jsonb(c) order by (data->>'sort_order')::integer,created_at),'[]'::jsonb)
      from (select id,kind,data,deleted_at,created_at from public.cye_content where deleted_at is null and data->>'published'='true') c) content
      from public.cye_site_settings s where s.id=true`);
    if (!result.rows[0]) throw new Error("Database setup is incomplete.");
    const records = result.rows[0].content.map(contentRow).map(record => record.kind === "team" && record.use_avatar ? { ...record, image_url: "" } : record);
    const grouped = Object.fromEntries(CONTENT_KINDS.map(kind => [kind, records.filter(record => record.kind === kind)]));
    return { ...grouped, settings: result.rows[0].settings, databaseAvailable: true } as PublicContent;
}, ["cye-public-content-v2"], { revalidate: 60, tags: [PUBLIC_CONTENT_TAG] });

export const getPublicContent = cache(async (): Promise<PublicContent> => {
  try { return await publishedContent(); } catch { return fallbackContent(); }
});
