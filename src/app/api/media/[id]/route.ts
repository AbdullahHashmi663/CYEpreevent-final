import { database } from "@/lib/server/db";
import { fail, handle } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await context.params;
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) fail(404, "Image not found.");
    const result = await database().query<{ mime_type: string; bytes: Buffer }>("select mime_type,bytes from public.cye_media where id=$1", [id]);
    const media = result.rows[0];
    if (!media) fail(404, "Image not found.");
    const headers = { "Content-Type": media.mime_type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Length": String(media.bytes.length), ETag: `"${id}"` };
    if (request.headers.get("if-none-match") === `"${id}"`) return new Response(null, { status: 304, headers });
    return new Response(new Uint8Array(media.bytes), { headers });
  });
}
