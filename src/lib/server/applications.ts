import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { ApplicationRecord, SiteSettings } from "@/lib/cms-types";
import { requiresPayment } from "@/lib/programme";
import type { PaymentReceipt } from "./receipts";
import { transaction } from "./admin";
import { fail, rateLimit } from "./http";
import { validateApplication } from "./validation";

const karachiDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" });
function localDate() { return karachiDate.format(new Date()); }
export async function submitApplication(request: Request, input: Record<string, unknown>, receipt?: PaymentReceipt) {
  if (input.kind === "contest") fail(409, "Competition registrations now use separate forms. Open the Competitions page and choose your competition.");
  const payload: ReturnType<typeof validateApplication> & Pick<ApplicationRecord, "payment_amount" | "payment_receipt_url"> = validateApplication(input);
  if (receipt && payload.kind !== "contest" && payload.kind !== "conference") fail(400, "Payment receipts are only accepted for paid event registrations.");
  await Promise.all([
    rateLimit(request, "applications-email", 5, 900, payload.email),
    rateLimit(request, "applications", process.env.TRUST_PROXY === "true" ? 20 : 250, 900),
  ]);
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
      if (requiresPayment({ ...entry.data, kind: entry.kind })) {
        if (!Number.isFinite(entry.data.fee) || entry.data.fee <= 0) fail(409, "The organizers have not set this event’s entry fee yet.");
        if (input.expected_fee !== entry.data.fee) fail(409, "The entry fee has changed. Refresh the page and confirm the current fee before submitting payment.");
        if (!receipt) fail(400, "Upload your payment receipt to register for this event.");
        payload.payment_amount = entry.data.fee;
      } else if (payload.kind === "conference") {
        if (receipt) fail(400, "The Talk is free and does not require a payment receipt.");
        payload.payment_amount = 0;
      }
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
    const applicationId = randomUUID();
    if (receipt) payload.payment_receipt_url = `/api/admin/receipts/${applicationId}`;
    await client.query("insert into public.cye_applications(id,reference,kind,entry_id,payload) values($1,$2,$3,$4,$5::jsonb)", [applicationId, reference, payload.kind, payload.entry_id || null, JSON.stringify(payload)]);
    if (receipt) await client.query("insert into public.cye_payment_receipts(application_id,mime_type,bytes) values($1,$2,$3)", [applicationId, receipt.mime, receipt.bytes]);
    return { reference, status: "pending" as const, message: payload.kind === "contact" ? "Your message has been received. The organizing team will review it." : "Your application has been received and is awaiting organizer approval." };
  });
}
