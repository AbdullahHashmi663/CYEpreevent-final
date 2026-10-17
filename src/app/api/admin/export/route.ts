import { requireAdmin, audit } from "@/lib/server/auth";
import { transaction } from "@/lib/server/admin";
import { handle } from "@/lib/server/http";

export const runtime = "nodejs";
function cell(value: unknown) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g,'""')}"`;
}
export async function GET() {
  return handle(async () => {
    const user = await requireAdmin();
    const rows = await transaction(async client => {
      const result = await client.query("select a.*,c.data->>'title' entry_title from public.cye_applications a left join public.cye_content c on c.id=a.entry_id order by a.created_at desc");
      await audit(client, user, "applications.exported", "all", { count: result.rows.length });
      return result.rows;
    });
    const columns = ["Reference","Type","Event","Status","Name","Email","Phone","University","Message","Department","Semester","Additional team members","Rejection reason","Submitted at","Archived at","Fee at registration (PKR)","Payment receipt (admin sign-in required)"];
    const lines = rows.map(row => [row.reference,row.kind,row.entry_title,row.status,row.payload.name,row.payload.email,row.payload.phone,row.payload.university,row.payload.message,row.payload.department,row.payload.semester,JSON.stringify(row.payload.team_members || []),row.rejection_reason,new Date(row.created_at).toISOString(),row.deleted_at ? new Date(row.deleted_at).toISOString() : "",row.payload.payment_amount ?? "",row.payload.payment_receipt_url || ""].map(cell).join(","));
    return new Response("\uFEFF" + columns.map(cell).join(",") + "\r\n" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cye-applications-${new Date().toISOString().slice(0,10)}.csv"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  });
}
