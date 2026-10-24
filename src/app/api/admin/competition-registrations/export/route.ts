import { requireAdmin, audit } from "@/lib/server/auth";
import { database } from "@/lib/server/db";
import { fail, handle, rateLimit } from "@/lib/server/http";
import { PARTNER_COMPETITIONS } from "@/lib/partner-competitions";
import { allCompetitionRegistrations, competitionWorkbook } from "@/lib/server/competition-export";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  return handle(async () => {
    const admin = await requireAdmin();
    const id = new URL(request.url).searchParams.get("competition") || "";
    if (!Object.hasOwn(PARTNER_COMPETITIONS, id)) fail(400, "Select one of the six competitions to export.");
    await rateLimit(request, "competition-export", 2, 60, admin.id);
    const name = PARTNER_COMPETITIONS[id as keyof typeof PARTNER_COMPETITIONS];
    const rows = await allCompetitionRegistrations(name);
    const languages = new Map<string, string>();
    if (id === "contest-4") {
      const result = await database().query("select partner_registration_id,language from public.cye_partner_speech_languages where partner_registration_id=any($1::bigint[])", [rows.map(row => row.id)]);
      for (const row of result.rows) languages.set(String(row.partner_registration_id), row.language);
    }
    const bytes = await competitionWorkbook(name, rows, languages, id === "contest-4");
    const client = await database().connect();
    try { await audit(client, admin, "competition.registrations.exported", id, { count: rows.length }); } finally { client.release(); }
    return new Response(bytes, { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="cye-${id}-registrations-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  });
}
