import "server-only";
import { consumeRateLimit, rateLimitKey } from "./rate-limit";

export class ApiError extends Error {
  constructor(public status: number, message: string, public headers?: HeadersInit) { super(message); }
}
export function fail(status: number, message: string): never { throw new ApiError(status, message); }
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== expected) fail(403, "This request must come from this website.");
}
export async function readLimitedBody(request: Request, maximum: number): Promise<Buffer> {
  if (Number(request.headers.get("content-length") || 0) > maximum) fail(413, "The submitted data is too large.");
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximum) { await reader.cancel(); fail(413, "The submitted data is too large."); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, length);
}
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  const raw = (await readLimitedBody(request, 65536)).toString("utf8");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { fail(400, "Please submit valid JSON data."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(400, "Invalid submitted data.");
  return value as Record<string, unknown>;
}
export function response(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "no-store");
  return Response.json(data, { status, headers });
}
export async function handle(work: () => Promise<Response>): Promise<Response> {
  try { return await work(); } catch (error) {
    if (error instanceof ApiError) return response({ error: error.message }, error.status, error.headers);
    const code = (error as { code?: string })?.code;
    if (code === "23505") return response({ error: "This record already exists. Please check your earlier submission." }, 409);
    // Log only a bounded error code; driver messages can contain private connection details.
    const diagnostic = error instanceof Error ? error.message.toLowerCase() : "";
    const category = /tenant or user not found/.test(diagnostic) ? "DATABASE_IDENTITY" : /max.*client|too many.*connection/.test(diagnostic) ? "DATABASE_CONNECTION_LIMIT" : /password|authentication/.test(diagnostic) ? "DATABASE_AUTHENTICATION" : "UNCLASSIFIED";
    console.error("CYE service error", typeof code === "string" && /^[A-Z0-9_]{2,70}$/.test(code) ? code : "UNEXPECTED_ERROR", category);
    return response({ error: "The service is temporarily unavailable. Please try again shortly." }, 503);
  }
}
export async function rateLimit(request: Request, scope: string, limit: number, seconds = 900, identity = "") {
  // Configure a trusted hosting proxy before enabling TRUST_PROXY for client IP limits.
  const ip = process.env.TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown" : "site";
  let result;
  try { result = await consumeRateLimit(rateLimitKey(scope, ip, identity), limit, seconds); }
  catch { throw new ApiError(503, "Request protection is temporarily unavailable. Please try again shortly.", { "Retry-After": "5" }); }
  if (!result.allowed) throw new ApiError(429, "Too many requests. Please try again later.", { "Retry-After": String(result.retryAfter) });
}
