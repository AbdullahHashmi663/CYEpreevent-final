import { requireAdmin } from "@/lib/server/auth";
import { moderateApplication } from "@/lib/server/admin";
import { checkOrigin, fail, handle, jsonBody, response } from "@/lib/server/http";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { return handle(async () => { checkOrigin(request); const user = await requireAdmin(); const { id } = await context.params; if (!/^[a-f0-9-]{36}$/.test(id)) fail(400, "Invalid application ID."); return response({ application: await moderateApplication(user, id, await jsonBody(request)) }); }); }
