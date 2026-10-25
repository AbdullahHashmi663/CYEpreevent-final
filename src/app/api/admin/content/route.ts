import { revalidateTag } from "next/cache";
import { PUBLIC_CONTENT_TAG } from "@/lib/server/content";
import { requireAdmin } from "@/lib/server/auth";
import { addContent } from "@/lib/server/admin";
import { checkOrigin, handle, jsonBody, response } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) { return handle(async () => { checkOrigin(request); const user = await requireAdmin(); const record = await addContent(user, await jsonBody(request)); revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 }); return response({ record }, 201); }); }
