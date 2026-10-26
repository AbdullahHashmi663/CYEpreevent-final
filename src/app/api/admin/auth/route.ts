import { database } from "@/lib/server/db";
import { currentAdmin, endSession, passwordMatches, startSession } from "@/lib/server/auth";
import { checkOrigin, fail, handle, jsonBody, rateLimit, response } from "@/lib/server/http";
import { text } from "@/lib/server/validation";
import type { AdminUser } from "@/lib/cms-types";

export const runtime = "nodejs";
export async function GET() { return handle(async () => response({ user: await currentAdmin() })); }
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    const input = await jsonBody(request);
    const address = text(input.email, "Username or email", 100, true).toLowerCase();
    if (!/^[a-z0-9][a-z0-9._@-]{2,99}$/.test(address)) fail(400, "Please enter a valid username or email address.");
    const password = text(input.password, "Password", 256, true);
    await Promise.all([
      rateLimit(request, "login-identity", 8, 900, address),
      rateLimit(request, "login", process.env.TRUST_PROXY === "true" ? 30 : 100, 900),
    ]);
    const result = await database().query<AdminUser & { password_hash: string }>("select id,email,must_change_password,password_hash from public.cye_admin_users where email=$1 and active=true", [address]);
    const account = result.rows[0];
    // Equalize password work for unknown accounts to discourage email enumeration.
    const dummy = "scrypt:00000000000000000000000000000000:" + "0".repeat(128);
    const valid = await passwordMatches(password, account?.password_hash || dummy);
    if (!account || !valid) fail(401, "Incorrect email or password.");
    const user: AdminUser = { id: account.id, email: account.email, must_change_password: account.must_change_password };
    await startSession(user);
    return response({ user });
  });
}
export async function DELETE(request: Request) { return handle(async () => { checkOrigin(request); await endSession(); return response({ user: null }); }); }
