import { requireAdmin, audit } from "@/lib/server/auth";
import { transaction } from "@/lib/server/admin";
import { fail, handle } from "@/lib/server/http";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireAdmin();
    const { id } = await context.params;
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) fail(404, "Receipt not found.");
    const row = await transaction(async client => {
      const result = await client.query("select mime_type,bytes from public.cye_payment_receipts where application_id=$1", [id]);
      if (!result.rows[0]) fail(404, "Receipt not found.");
      await audit(client, user, "payment.receipt_viewed", id);
      return result.rows[0];
    });
    const extension = ({ "image/png":"png", "image/jpeg":"jpg", "image/webp":"webp", "application/pdf":"pdf" } as Record<string,string>)[row.mime_type];
    return new Response(new Uint8Array(row.bytes), { headers: {
      "Content-Type": row.mime_type, "Content-Disposition": `attachment; filename="payment-receipt.${extension}"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  });
}
