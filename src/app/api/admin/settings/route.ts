import { revalidateTag } from "next/cache";
import { PUBLIC_CONTENT_TAG } from "@/lib/server/content";
import { requireAdmin } from "@/lib/server/auth";
import { saveSettings } from "@/lib/server/admin";
import { checkOrigin, handle, jsonBody, response } from "@/lib/server/http";
export const runtime = "nodejs";
export async function PUT(request: Request) { return handle(async () => { checkOrigin(request); const user = await requireAdmin(); const settings = await saveSettings(user, await jsonBody(request)); revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 }); return response({ settings }); }); }
