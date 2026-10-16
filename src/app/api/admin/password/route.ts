import { randomBytes } from "node:crypto";
import { audit, passwordHash, passwordMatches, requireAdmin, SESSION_SECONDS, setSessionCookie, tokenHash } from "@/lib/server/auth";
import { transaction } from "@/lib/server/admin";
import { checkOrigin, fail, handle, jsonBody, rateLimit, response } from "@/lib/server/http";
import { text } from "@/lib/server/validation";

export const runtime = "nodejs";
export async function PATCH(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    const user = await requireAdmin(true);
    await rateLimit(request, "password-change", 8, 900, user.id);
    const input = await jsonBody(request);
    const current = text(input.current_password, "Current password", 256, true);
    const password = text(input.new_password, "New password", 256, true);
    if (password.length < 12) fail(400, "Choose a password with at least 12 characters.");
    if (password === current) fail(400, "Choose a different password from your current password.");
    const hash = await passwordHash(password);
    const token = randomBytes(32).toString("hex");
    await transaction(async client => {
      const result = await client.query("select password_hash from public.cye_admin_users where id=$1 for update", [user.id]);
      if (!result.rows[0] || !(await passwordMatches(current, result.rows[0].password_hash))) fail(401, "Your current password is incorrect.");
      await client.query("update public.cye_admin_users set password_hash=$2,must_change_password=false where id=$1", [user.id, hash]);
      await client.query("delete from public.cye_admin_sessions where admin_id=$1", [user.id]);
      await client.query("insert into public.cye_admin_sessions(token_hash,admin_id,expires_at) values($1,$2,now()+make_interval(secs=>$3))", [tokenHash(token), user.id, SESSION_SECONDS]);
      await audit(client, user, "admin.password_changed", user.id);
    });
    await setSessionCookie(token);
    return response({ user: { ...user, must_change_password: false }, message: "Password updated." });
  });
}
