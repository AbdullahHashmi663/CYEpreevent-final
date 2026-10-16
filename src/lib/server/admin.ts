import "server-only";
import { randomUUID } from "node:crypto";
import type { AdminData, AdminUser, ContentRecord, SiteSettings } from "@/lib/cms-types";
import type { PoolClient } from "pg";
import { database } from "./db";
import { audit } from "./auth";
import { applicationRow, contentRow } from "./content";
import { fail } from "./http";
import { text, validateContent, validateSettings } from "./validation";

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database().connect();
  try { await client.query("begin"); const result = await work(client); await client.query("commit"); return result; }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
export async function getAdminData(user: AdminUser): Promise<AdminData> {
  const [settings, content, applications, auditRecords] = await Promise.all([
    database().query<{ data: SiteSettings }>("select data from public.cye_site_settings where id=true"),
    database().query("select id,kind,data,deleted_at from public.cye_content order by kind,(data->>'sort_order')::integer,created_at"),
    database().query("select a.*,c.data->>'title' entry_title from public.cye_applications a left join public.cye_content c on c.id=a.entry_id order by a.created_at desc limit 10000"),
    database().query("select id,action,target_id,admin_email,created_at from public.cye_audit order by created_at desc limit 50"),
  ]);
  if (!settings.rows[0]) fail(503, "Database setup is incomplete.");
  return { settings: settings.rows[0].data, content: content.rows.map(contentRow), applications: applications.rows.map(applicationRow), audit: auditRecords.rows.map(row => ({ ...row, created_at: new Date(row.created_at).toISOString() })), user };
}
async function validateSpeakers(client: PoolClient, record: ContentRecord) {
  if (!record.speaker_ids.length) return;
  if (record.kind !== "conferences") fail(400, "Only conferences can have assigned speakers.");
  const result = await client.query("select id from public.cye_content where id=any($1::text[]) and kind='speakers' and deleted_at is null", [record.speaker_ids]);
  if (result.rows.length !== record.speaker_ids.length) fail(400, "One or more selected speakers are unavailable.");
}
export async function addContent(user: AdminUser, input: Record<string, unknown>) {
  const record = validateContent(input);
  record.id = randomUUID();
  return transaction(async client => {
    await validateSpeakers(client, record);
    await client.query("insert into public.cye_content(id,kind,data) values($1,$2,$3::jsonb)", [record.id, record.kind, JSON.stringify(record)]);
    await audit(client, user, "content.created", record.id, { kind: record.kind, title: record.title });
    return record;
  });
}
export async function editContent(user: AdminUser, id: string, input: Record<string, unknown>, deleted = false) {
  return transaction(async client => {
    const result = await client.query("select id,kind,data,deleted_at from public.cye_content where id=$1 for update", [id]);
    if (!result.rows[0]) fail(404, "Content was not found.");
    const existing = contentRow(result.rows[0]);
    let record = existing;
    let action = "content.updated";
    if (deleted) { record = { ...existing, deleted_at: new Date().toISOString() }; action = "content.archived"; }
    else if (input.restore === true) { record = { ...existing, deleted_at: null }; action = "content.restored"; }
    else {
      if (existing.deleted_at) fail(409, "Restore this content before editing it.");
      record = validateContent({ ...input, id }, existing);
      await validateSpeakers(client, record);
    }
    await client.query("update public.cye_content set data=$2::jsonb,deleted_at=$3,updated_at=now() where id=$1", [id, JSON.stringify(record), record.deleted_at]);
    await audit(client, user, action, id, { kind: record.kind, title: record.title });
    return record;
  });
}
export async function saveSettings(user: AdminUser, input: Record<string, unknown>) {
  const settings = validateSettings(input);
  return transaction(async client => {
    await client.query("insert into public.cye_site_settings(id,data) values(true,$1::jsonb) on conflict(id) do update set data=excluded.data,updated_at=now()", [JSON.stringify(settings)]);
    await audit(client, user, "settings.updated", "site");
    return settings;
  });
}
export async function moderateApplication(user: AdminUser, id: string, input: Record<string, unknown>) {
  return transaction(async client => {
    const result = await client.query("select * from public.cye_applications where id=$1 for update", [id]);
    if (!result.rows[0]) fail(404, "Application was not found.");
    const existing = result.rows[0];
    let deletedAt = existing.deleted_at;
    let status = existing.status;
    let reason = existing.rejection_reason;
    let action = "application.updated";
    if (input.deleted === true) { deletedAt = new Date(); action = "application.archived"; }
    else if (input.restore === true) { deletedAt = null; action = "application.restored"; }
    else {
      if (deletedAt) fail(409, "Restore this application before reviewing it.");
      if (!["pending", "approved", "rejected"].includes(input.status as string)) fail(400, "Please select a valid approval status.");
      status = input.status;
      reason = status === "rejected" ? text(input.rejection_reason, "Rejection reason", 1000, true) : "";
      action = `application.${status}`;
    }
    // Serialize capacity checks with public submission, including restores of active applications.
    if (existing.entry_id && deletedAt === null && status !== "rejected") {
      const entry = await client.query("select data,deleted_at from public.cye_content where id=$1 for update", [existing.entry_id]);
      if (!entry.rows[0] || entry.rows[0].deleted_at) fail(409, "The associated event is archived.");
      const capacity = entry.rows[0].data.capacity;
      if (capacity > 0) {
        const count = await client.query<{ total: string }>("select coalesce(sum(1+jsonb_array_length(coalesce(payload->'team_members','[]'::jsonb))),0) total from public.cye_applications where entry_id=$1 and deleted_at is null and status<>'rejected' and id<>$2", [existing.entry_id, id]);
        const requested = 1 + (existing.payload.team_members || []).length;
        if (Number(count.rows[0].total) + requested > capacity) fail(409, "This event has reached its participant capacity.");
      }
    }
    const updated = await client.query("update public.cye_applications set status=$2,rejection_reason=$3,deleted_at=$4,updated_at=now() where id=$1 returning *", [id, status, reason, deletedAt]);
    const title = existing.entry_id ? await client.query("select data->>'title' title from public.cye_content where id=$1", [existing.entry_id]) : null;
    await audit(client, user, action, id, { reference: existing.reference });
    return applicationRow({ ...updated.rows[0], entry_title: title?.rows[0]?.title || "" });
  });
}
