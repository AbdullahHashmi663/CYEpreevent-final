import { requireAdmin } from "@/lib/server/auth";
import { addContent } from "@/lib/server/admin";
import { checkOrigin, handle, jsonBody, response } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) { return handle(async () => { checkOrigin(request); const user = await requireAdmin(); return response({ record: await addContent(user, await jsonBody(request)) }, 201); }); }
