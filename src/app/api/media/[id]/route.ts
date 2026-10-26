import { database } from "@/lib/server/db";
import { fail, handle } from "@/lib/server/http";
export const runtime = "nodejs";
async function serve(request: Request, context: { params: Promise<{ id: string }> }, head = false) {
  return handle(async () => {
    const { id } = await context.params;
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) fail(404, "Image not found.");
    const unchanged = request.headers.get("if-none-match")?.split(",").some(tag => tag.trim().replace(/^W\//, "") === `"${id}"` || tag.trim() === "*") || false;
    // HEAD and conditional hits verify existence without transferring the image blob from Postgres.
    const result = await database().query<{ mime_type: string; bytes: Buffer | null; length: number }>("select mime_type,octet_length(bytes) length,case when $2::boolean then null else bytes end bytes from public.cye_media where id=$1", [id, head || unchanged]);
    const media = result.rows[0];
    if (!media) fail(404, "Image not found.");
    const headers = { "Content-Type": media.mime_type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Length": String(media.length), ETag: `"${id}"` };
    if (unchanged) return new Response(null, { status: 304, headers });
    return new Response(head ? null : new Uint8Array(media.bytes!), { headers });
  });
}
export function GET(request: Request, context: { params: Promise<{ id: string }> }) { return serve(request, context); }
export function HEAD(request: Request, context: { params: Promise<{ id: string }> }) { return serve(request, context, true); }
