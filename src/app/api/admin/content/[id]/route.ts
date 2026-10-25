import { revalidateTag } from "next/cache";
import { PUBLIC_CONTENT_TAG } from "@/lib/server/content";
import { requireAdmin } from "@/lib/server/auth";
import { editContent } from "@/lib/server/admin";
import { checkOrigin, handle, jsonBody, response } from "@/lib/server/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) { return handle(async () => { checkOrigin(request); const user = await requireAdmin(); const { id } = await context.params; const record = await editContent(user, id, await jsonBody(request)); revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 }); return response({ record }); }); }
export async function DELETE(request: Request, context: Context) { return handle(async () => { checkOrigin(request); const user = await requireAdmin(); const { id } = await context.params; const record = await editContent(user, id, {}, true); revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 }); return response({ record }); }); }
