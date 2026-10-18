import { verifyAccessCode } from "@/lib/server/access-codes";
import { checkOrigin, handle, jsonBody, response } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () => { checkOrigin(request); return response(await verifyAccessCode(request, await jsonBody(request))); });
}
