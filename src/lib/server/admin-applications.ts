import "server-only";
import type { AdminApplicationPage, ApplicationRecord } from "@/lib/cms-types";
import { database } from "./db";
import { applicationRow } from "./content";
import { fail } from "./http";

export const APPLICATION_PAGE_SIZE = 20;
export function applicationFilters(params: URLSearchParams) {
  const page = Number(params.get("page") || "1");
  const query = (params.get("q") || "").trim();
  const status = params.get("status") || "all";
  const kind = params.get("kind") || "all";
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || query.length > 160 ||
      !["all", "pending", "approved", "rejected"].includes(status) ||
      !["all", "contest", "conference", "contact", "ambassador"].includes(kind)) fail(400, "Invalid application filters.");
  return { page, query, status, kind, archived: params.get("archived") === "true" };
}

// Count and page share one statement snapshot. Only the requested page carries participant data.
export async function getAdminApplications(params: URLSearchParams): Promise<AdminApplicationPage> {
  const filter = applicationFilters(params);
  const values: unknown[] = [];
  const where = [`a.deleted_at is ${filter.archived ? "not " : ""}null`];
  const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
  if (filter.status !== "all") where.push(`a.status=${bind(filter.status)}`);
  if (filter.kind !== "all") where.push(`a.kind=${bind(filter.kind)}`);
  if (filter.query) {
    const pattern = bind(`%${filter.query.replace(/[\\%_]/g, "\\$&")}%`);
    where.push(`concat_ws(' ',a.payload->>'name',a.payload->>'email',a.reference,c.data->>'title',a.payload->>'university') ilike ${pattern} escape '\\'`);
  }
  const limit = bind(APPLICATION_PAGE_SIZE);
  const offset = bind((filter.page - 1) * APPLICATION_PAGE_SIZE);
  const result = await database().query<{ total: number; applications: Record<string, unknown>[] }>(`
    with matched as not materialized (
      select a.*,c.data->>'title' entry_title from public.cye_applications a
      left join public.cye_content c on c.id=a.entry_id where ${where.join(" and ")}
    ), page as (select * from matched order by created_at desc,id desc limit ${limit} offset ${offset})
    select (select count(*)::int from matched) total,
      coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc) from page p),'[]'::jsonb) applications`, values);
  return { applications: result.rows[0].applications.map(applicationRow), total: result.rows[0].total, page: filter.page, pageSize: APPLICATION_PAGE_SIZE };
}

export type ApplicationExportRow = Record<string, unknown> & {
  id: string; created_at: string; reference: string; kind: string; entry_title: string;
  status: string; rejection_reason: string; deleted_at: string | null; payload: ApplicationRecord;
};
