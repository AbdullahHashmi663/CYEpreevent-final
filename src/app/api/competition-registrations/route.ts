import { getPartnerCatalogue, partnerRequest } from "@/lib/server/partner";
import { PARTNER_COMPETITIONS, validatePartnerRegistration } from "@/lib/partner-competitions";
import { recordSpeechLanguage, finishSpeechLanguage } from "@/lib/server/speech-languages";
import { checkOrigin, fail, handle, rateLimit, readLimitedBody, response } from "@/lib/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    const type = request.headers.get("content-type") || "";
    if (!type.startsWith("multipart/form-data;")) fail(415, "Submit the registration with a payment slip.");
    // Protect upload parsing and the authoritative upstream catalogue, not just the final write.
    await rateLimit(request, "partner-registration", 50, 60);
    const raw = await readLimitedBody(request, 4194304 + 131072);
    let form: FormData;
    try { form = await new Response(new Uint8Array(raw), { headers: { "Content-Type": type } }).formData(); } catch { fail(400, "Invalid form upload."); }
    const id = form.get("entry_id");
    if (typeof id !== "string" || !Object.hasOwn(PARTNER_COMPETITIONS, id)) fail(400, "Choose one of the six available competitions.");
    const catalogue = await getPartnerCatalogue();
    if (!catalogue.registrationOpen) fail(403, "CYE competition registration is currently closed.");
    const competition = catalogue.competitions.find(c => c.localId === id);
    if (!competition) fail(400, "Choose one of the six available competitions.");
    if (form.get("expected_fee") !== competition.fee) fail(409, "The competition fee has changed. Refresh this page and confirm the current fee before paying.");
    let registration;
    try {
      const value = form.get("registration");
      if (typeof value !== "string" || value.length > 65536) throw Error("Invalid registration details.");
      registration = validatePartnerRegistration(JSON.parse(value), competition);
    } catch (error) { fail(422, error instanceof SyntaxError ? "Invalid registration details." : (error as Error).message); }
    const slip = form.get("paymentSlip");
    if (!(slip instanceof File) || !slip.size) fail(422, "Upload your payment slip.");
    if (slip.size > 4194304) fail(413, "Payment slips must be 4 MB or smaller.");
    const bytes = Buffer.from(await slip.arrayBuffer());
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const webp = bytes.subarray(0,4).toString() === "RIFF" && bytes.subarray(8,12).toString() === "WEBP";
    const heic = bytes.subarray(4,8).toString() === "ftyp" && /heic|heix|hevc|hevx|mif1/.test(bytes.subarray(8,40).toString("ascii"));
    if (!jpeg && !png && !webp && !heic) fail(415, "Upload a JPEG, PNG, WebP or HEIC image.");
    await rateLimit(request, "partner-registration-email", 1, 60, registration.members[0].email);
    const speechEntryId = await recordSpeechLanguage(registration);
    const body = new FormData();
    // The external API has no language field; keep its documented payload intact.
    const { speechLanguage, ...partnerRegistration } = registration;
    body.set("registration", JSON.stringify(partnerRegistration));
    body.set("paymentSlip", new Blob([bytes], { type: jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : "image/heic" }), jpeg ? "receipt.jpg" : png ? "receipt.png" : webp ? "receipt.webp" : "receipt.heic");
    let upstream: Response;
    try { upstream = await partnerRequest("/registrations", { method: "POST", body }); }
    catch { return response({ error: "We could not confirm whether CYE received your entry. Check the team lead’s email and contact the organizers before submitting again to avoid a duplicate registration.", uncertain: true }, 503); }
    let result;
    try { result = await upstream.json(); } catch { return response({ error: "The CYE response could not be confirmed. Check your email and contact the organizers before submitting again.", uncertain: true }, 503); }
    if (upstream.status !== 201) {
      if (upstream.status >= 500) return response({ error: "CYE could not confirm your entry. Check your email and contact the organizers before retrying.", uncertain: true }, 503);
      await finishSpeechLanguage(speechEntryId, null, true);
      return response({ error: upstream.status === 401 ? "Competition registration is temporarily unavailable. Contact the organizing team." : typeof result.error === "string" ? result.error.slice(0,600) : "CYE could not accept this entry." }, [400,403,413,415,422,429].includes(upstream.status) ? upstream.status : 503);
    }
    if (!Number.isInteger(result.id)) return response({ error: "Check your confirmation email and contact the organizers for your registration reference. Do not submit again.", uncertain: true }, 503);
    await finishSpeechLanguage(speechEntryId, result.id);
    return response({ id: result.id, status: result.status, paymentStatus: result.paymentStatus, paymentSlipUploaded: result.paymentSlipUploaded, ...(speechLanguage ? { speechLanguage } : {}) }, 201);
  });
}
