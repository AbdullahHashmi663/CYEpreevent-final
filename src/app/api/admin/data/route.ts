import { requireAdmin } from "@/lib/server/auth";
import { getAdminData } from "@/lib/server/admin";
import { handle, response } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET() { return handle(async () => response(await getAdminData(await requireAdmin(true)))); }
