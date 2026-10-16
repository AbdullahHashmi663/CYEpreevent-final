import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { SiteSettings } from "@/lib/cms-types";
import { transaction } from "./admin";
import { fail, rateLimit } from "./http";
import { validateApplication } from "./validation";

function localDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export async function submitApplication(request: Request, input: Record<string, unknown>) {
  const payload = validateApplication(input);
  await rateLimit(request, "applications-email", 5, 900, payload.email);
  await rateLimit(request, "applications", process.env.TRUST_PROXY === "true" ? 20 : 250, 900);
  return transaction(async client => {
    const settingsResult = await client.query<{ data: SiteSettings }>("select data from public.cye_site_settings where id=true for share");
    if (!settingsResult.rows[0]) fail(503, "Database setup is incomplete.");
    const settings = settingsResult.rows[0].data;
    if (payload.kind !== "contact") {
      if (!settings.registration_open) fail(409, "Registration is currently closed. Please contact the organizers for assistance.");
      if (settings.event_date < localDate()) fail(409, "Registration for this event has ended.");
    }
    if (payload.entry_id) {
      const result = await client.query("select kind,data,deleted_at from public.cye_content where id=$1 for update", [payload.entry_id]);
      const entry = result.rows[0];
      const expectedKind = payload.kind === "contest" ? "contests" : "conferences";
      if (!entry || entry.kind !== expectedKind || entry.deleted_at || !entry.data.published) fail(404, "This event is no longer available for registration.");
      if ((entry.data.date || settings.event_date) < localDate()) fail(409, "Registration for this event has ended.");
      const teamSize = 1 + (payload.team_members || []).length;
      const minimum = payload.kind === "contest" ? entry.data.min_members ?? 1 : 1;
      if (teamSize < minimum) fail(400, `This event requires at least ${minimum} participant(s) per registration.`);
      if (teamSize > (payload.kind === "contest" ? entry.data.max_members : 1)) fail(400, `This event accepts at most ${entry.data.max_members} participant(s) per registration.`);
      if (entry.data.capacity > 0) {
        const count = await client.query<{ total: string }>("select coalesce(sum(1+jsonb_array_length(coalesce(payload->'team_members','[]'::jsonb))),0) total from public.cye_applications where entry_id=$1 and deleted_at is null and status<>'rejected'", [payload.entry_id]);
        if (Number(count.rows[0].total) + teamSize > entry.data.capacity) fail(409, "This event has reached its participant capacity.");
      }
    }
    const reference = `CYE-${randomBytes(5).toString("hex").toUpperCase()}`;
    await client.query("insert into public.cye_applications(id,reference,kind,entry_id,payload) values($1,$2,$3,$4,$5::jsonb)", [randomUUID(), reference, payload.kind, payload.entry_id || null, JSON.stringify(payload)]);
    return { reference, status: "pending" as const, message: payload.kind === "contact" ? "Your message has been received. The organizing team will review it." : "Your application has been received and is awaiting organizer approval." };
  });
}
