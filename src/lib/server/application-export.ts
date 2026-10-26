import "server-only";
import { database } from "./db";
import type { ApplicationExportRow } from "./admin-applications";

function cell(value: unknown) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
const columns = ["Reference","Type","Event","Status","Name","Email","Phone","University","Message","Department","Semester","Additional team members","Rejection reason","Submitted at","Archived at","Fee at registration (PKR)","Payment receipt (admin sign-in required)","CNIC / B-Form / Enrollment number"];
function line(row: ApplicationExportRow) {
  return [row.reference,row.kind,row.entry_title,row.status,row.payload.name,row.payload.email,row.payload.phone,row.payload.university,row.payload.message,row.payload.department,row.payload.semester,JSON.stringify(row.payload.team_members || []),row.rejection_reason,new Date(row.created_at).toISOString(),row.deleted_at ? new Date(row.deleted_at).toISOString() : "",row.payload.payment_amount ?? "",row.payload.payment_receipt_url || "",row.payload.identification_number || ""].map(cell).join(",") + "\r\n";
}

// A server cursor keeps one consistent snapshot without buffering the entire export in Node.
// A cancelled/slow download rolls back and returns (or destroys) its connection.
export async function* applicationCsv() {
  const client = await database().connect();
  let complete = false;
  let broken = false;
  const connectionError = () => { broken = true; };
  client.on("error", connectionError);
  const encode = new TextEncoder();
  const started = Date.now();
  try {
    await client.query("begin isolation level repeatable read read only; set local idle_in_transaction_session_timeout='15s'");
    await client.query("declare cye_export no scroll cursor for select a.*,c.data->>'title' entry_title from public.cye_applications a left join public.cye_content c on c.id=a.entry_id order by a.created_at desc,a.id desc");
    let batch = await client.query<ApplicationExportRow>("fetch forward 200 from cye_export");
    yield encode.encode("\uFEFF" + columns.map(cell).join(",") + "\r\n");
    while (batch.rows.length) {
      if (Date.now() - started > 210000) throw Error("EXPORT_TIMEOUT");
      yield encode.encode(batch.rows.map(line).join(""));
      batch = await client.query<ApplicationExportRow>("fetch forward 200 from cye_export");
    }
    await client.query("commit");
    complete = true;
  } finally {
    if (!complete) { try { await client.query("rollback"); } catch { broken = true; } }
    client.removeListener("error", connectionError);
    client.release(broken);
  }
}

export async function applicationCsvStream() {
  const iterator = applicationCsv();
  // Check the database/cursor before the HTTP response starts.
  const first = await iterator.next();
  let initial = true;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let ended = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      idleTimer = setTimeout(() => {
        ended = true;
        controller.error(new Error("Download timed out. Please try again."));
        void iterator.return(undefined).catch(() => {});
      }, 10000);
    },
    async pull(controller) {
      if (idleTimer) clearTimeout(idleTimer);
      try {
        const chunk = initial ? first : await iterator.next();
        initial = false;
        if (chunk.done) { ended = true; controller.close(); }
        else {
          controller.enqueue(chunk.value);
          idleTimer = setTimeout(() => {
            if (ended) return;
            ended = true;
            controller.error(new Error("Download timed out. Please try again."));
            void iterator.return(undefined).catch(() => {});
          }, 10000);
        }
      } catch {
        ended = true;
        await iterator.return(undefined).catch(() => {});
        console.error("CYE_EXPORT_STREAM_FAILED");
        controller.error(new Error("The export could not be completed. Download the file again."));
      }
    },
    async cancel() { ended = true; if (idleTimer) clearTimeout(idleTimer); await iterator.return(undefined); },
  }, { highWaterMark: 1 });
}
