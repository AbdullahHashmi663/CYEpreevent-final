import { requireAdmin, audit } from "@/lib/server/auth";
import { transaction } from "@/lib/server/admin";
import { handle, rateLimit } from "@/lib/server/http";
import { applicationCsvStream } from "@/lib/server/application-export";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireAdmin();
    await rateLimit(request, "application-export", 2, 60, user.id);
    await transaction(client => audit(client, user, "applications.exported", "all", { delivery: "streamed" }));
    return new Response(await applicationCsvStream(), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cye-applications-${new Date().toISOString().slice(0,10)}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  });
}
