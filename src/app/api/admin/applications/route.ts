import { requireAdmin } from "@/lib/server/auth";
import { getAdminApplications } from "@/lib/server/admin-applications";
import { handle, response } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin();
    return response(await getAdminApplications(new URL(request.url).searchParams));
  });
}
