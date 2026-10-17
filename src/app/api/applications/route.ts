import { submitApplication } from "@/lib/server/applications";
import { checkOrigin, fail, handle, jsonBody, readLimitedBody, response } from "@/lib/server/http";
import { paymentReceipt } from "@/lib/server/receipts";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    const type = request.headers.get("content-type") || "";
    if (type.startsWith("multipart/form-data;")) {
      const body = await readLimitedBody(request, 2097152 + 131072);
      let form: FormData;
      try { form = await new Response(new Uint8Array(body), { headers: { "Content-Type": type } }).formData(); }
      catch { fail(400, "Invalid receipt upload."); }
      const raw = form.get("payload");
      if (typeof raw !== "string" || Buffer.byteLength(raw) > 65536) fail(400, "Invalid application details.");
      let input: unknown;
      try { input = JSON.parse(raw); } catch { fail(400, "Invalid application details."); }
      if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "Invalid application details.");
      const receipt = await paymentReceipt(form.get("receipt"));
      return response(await submitApplication(request, input as Record<string, unknown>, receipt), 201);
    }
    return response(await submitApplication(request, await jsonBody(request)), 201);
  });
}
