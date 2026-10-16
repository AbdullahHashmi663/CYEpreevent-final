import { randomUUID } from "node:crypto";
import { audit, requireAdmin } from "@/lib/server/auth";
import { transaction } from "@/lib/server/admin";
import { checkOrigin, fail, handle, readLimitedBody, response } from "@/lib/server/http";
import { imageType } from "@/lib/server/media";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    const user = await requireAdmin();
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data;")) fail(400, "Please submit an image file.");
    const body = await readLimitedBody(request, 2097152 + 65536);
    let form: FormData;
    try { form = await new Response(new Uint8Array(body), { headers: { "Content-Type": contentType } }).formData(); }
    catch { fail(400, "Invalid file upload."); }
    const file = form.get("file");
    if (!(file instanceof File)) fail(400, "Please select an image file.");
    if (file.size > 2097152) fail(413, "Images must be 2 MB or smaller.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = imageType(bytes);
    if (file.type && file.type !== mime) fail(400, "The image format does not match the file type.");
    const id = randomUUID();
    await transaction(async client => {
      await client.query("insert into public.cye_media(id,mime_type,bytes,admin_id) values($1,$2,$3,$4)", [id, mime, bytes, user.id]);
      await audit(client, user, "media.uploaded", id, { type: mime, size: bytes.length });
    });
    return response({ url: `/api/media/${id}` }, 201);
  });
}
