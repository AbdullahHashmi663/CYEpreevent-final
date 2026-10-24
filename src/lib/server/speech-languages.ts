import "server-only";
import { randomUUID } from "node:crypto";
import { database } from "./db";
import type { PartnerRegistration, SpeechLanguage } from "@/lib/partner-competitions";

// Save before forwarding so a lost upstream response never loses the language choice.
export async function recordSpeechLanguage(registration: PartnerRegistration): Promise<string | null> {
  if (!registration.speechLanguage) return null;
  const id = randomUUID();
  await database().query("insert into public.cye_partner_speech_languages(id,participant_email,language) values($1,$2,$3)", [id, registration.members[0].email, registration.speechLanguage]);
  return id;
}
export async function finishSpeechLanguage(id: string | null, registrationId: number | null, rejected = false) {
  if (!id) return;
  try {
    await database().query("update public.cye_partner_speech_languages set partner_registration_id=$2,state=$3 where id=$1", [id, registrationId, rejected ? "rejected" : "confirmed"]);
  } catch {
    // The durable pending row remains visible to admins for manual reconciliation.
    // Never turn an accepted upstream registration into a retryable failure.
    console.error("SPEECH_LANGUAGE_REFERENCE_PENDING");
  }
}
export interface SpeechLanguageRow { id: string; participant_email: string; language: SpeechLanguage; partner_registration_id: string | null; created_at: Date }
// Call only after the admin authentication check.
export async function adminSpeechLanguages(registrationIds: number[]) {
  const [confirmed, pending] = await Promise.all([
    database().query<SpeechLanguageRow>("select id,participant_email,language,partner_registration_id,created_at from public.cye_partner_speech_languages where partner_registration_id=any($1::bigint[])", [registrationIds]),
    database().query<SpeechLanguageRow>("select id,participant_email,language,partner_registration_id,created_at from public.cye_partner_speech_languages where state='pending' order by created_at desc limit 50"),
  ]);
  return { confirmed: confirmed.rows, pending: pending.rows };
}
