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
    const code = text(input.code, "Email verification code", 6, true);
    const challengeId = text(input.challenge_id, "Verification request", 36, true);
    if (!/^\d{6}$/.test(code) || !/^[a-f0-9-]{36}$/i.test(challengeId)) fail(400, "Request an email code and enter its six digits.");
    const hash = await passwordHash(password);
    const token = randomBytes(32).toString("hex");
    const verificationError = await transaction(async client => {
      const result = await client.query("select password_hash from public.cye_admin_users where id=$1 for update", [user.id]);
      if (!result.rows[0] || !(await passwordMatches(current, result.rows[0].password_hash))) fail(401, "Your current password is incorrect.");
      const verification = await client.query("select *,expires_at>now() as valid from public.cye_password_codes where admin_id=$1 for update", [user.id]);
      const challenge = verification.rows[0];
      if (!challenge || challenge.challenge_id !== challengeId || !challenge.valid || challenge.attempts >= 5 || challenge.password_hash_at_issue !== result.rows[0].password_hash) {
        return "The verification code expired or is unavailable. Request a new code.";
      }
      if (!(await passwordMatches(code, challenge.code_hash))) {
        await client.query("update public.cye_password_codes set attempts=attempts+1 where admin_id=$1", [user.id]);
        return "Incorrect verification code. After five incorrect attempts, request a new code.";
      }
      await client.query("update public.cye_admin_users set password_hash=$2,must_change_password=false where id=$1", [user.id, hash]);
      await client.query("delete from public.cye_password_codes where admin_id=$1", [user.id]);
      await client.query("delete from public.cye_admin_sessions where admin_id=$1", [user.id]);
      await client.query("insert into public.cye_admin_sessions(token_hash,admin_id,expires_at) values($1,$2,now()+make_interval(secs=>$3))", [tokenHash(token), user.id, SESSION_SECONDS]);
      await audit(client, user, "admin.password_changed", user.id);
      return null;
    });
    if (verificationError) fail(400, verificationError);
    await setSessionCookie(token);
    return response({ user: { ...user, must_change_password: false }, message: "Password updated." });
  });
}
