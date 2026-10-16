import { submitApplication } from "@/lib/server/applications";
import { checkOrigin, handle, jsonBody, response } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) { return handle(async () => { checkOrigin(request); return response(await submitApplication(request, await jsonBody(request)), 201); }); }
