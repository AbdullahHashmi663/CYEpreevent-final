import "server-only";
import { fail } from "./http";
import { imageType } from "./media";

export interface PaymentReceipt { bytes: Buffer; mime: string }
export async function paymentReceipt(file: FormDataEntryValue | null): Promise<PaymentReceipt | undefined> {
  if (!(file instanceof File) || !file.size) return undefined;
  if (file.size > 2097152) fail(413, "Payment receipts must be 2 MB or smaller.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const pdf = bytes.subarray(0,5).toString("ascii") === "%PDF-" && bytes.subarray(-1024).includes(Buffer.from("%%EOF"));
  const mime = pdf ? "application/pdf" : imageType(bytes);
  if (file.type && file.type !== mime) fail(400, "The receipt format does not match its file type.");
  return { bytes, mime };
}
