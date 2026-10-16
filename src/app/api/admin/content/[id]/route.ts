import { requireAdmin } from "@/lib/server/auth";
import { editContent } from "@/lib/server/admin";
import { checkOrigin, handle, jsonBody, response } from "@/lib/server/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) { return handle(async () => { checkOrigin(request); const user = await requireAdmin(); const { id } = await context.params; return response({ record: await editContent(user, id, await jsonBody(request)) }); }); }
export async function DELETE(request: Request, context: Context) { return handle(async () => { checkOrigin(request); const user = await requireAdmin(); const { id } = await context.params; return response({ record: await editContent(user, id, {}, true) }); }); }
