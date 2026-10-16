import { requireAdmin } from "@/lib/server/auth";
import { saveSettings } from "@/lib/server/admin";
import { checkOrigin, handle, jsonBody, response } from "@/lib/server/http";
export const runtime = "nodejs";
export async function PUT(request: Request) { return handle(async () => { checkOrigin(request); const user = await requireAdmin(); return response({ settings: await saveSettings(user, await jsonBody(request)) }); }); }
