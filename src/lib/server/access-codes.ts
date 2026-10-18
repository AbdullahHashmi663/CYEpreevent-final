import "server-only";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import type { AdminUser } from "@/lib/cms-types";
import { transaction } from "./admin";
import { audit, passwordHash, passwordMatches, SESSION_SECONDS, setSessionCookie, tokenHash } from "./auth";
import { fail, rateLimit } from "./http";
import { passwordEmailConfiguration, sendPasswordCode } from "./password-email";
import { text } from "./validation";

function accessInput(input: Record<string, unknown>) {
  const address = text(input.email, "Username or email", 100, true).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._@-]{2,99}$/.test(address)) fail(400, "Please enter a valid username or email address.");
  if (input.purpose !== "login" && input.purpose !== "reset") fail(400, "Choose sign-in or password reset.");
  return { address, purpose: input.purpose as "login" | "reset" };
}

export async function requestAccessCode(request: Request, input: Record<string, unknown>) {
  const { address, purpose } = accessInput(input);
  await rateLimit(request, "access-code-identity", 3, 900, address);
  await rateLimit(request, "access-code-global", process.env.TRUST_PROXY === "true" ? 10 : 30, 900);
  passwordEmailConfiguration();
  const id = randomUUID();
  const code = randomInt(0, 1000000).toString().padStart(6, "0");
  const hash = await passwordHash(code);
  await transaction(async client => {
    const result = await client.query("select id,email,must_change_password,password_hash from public.cye_admin_users where email=$1 and active=true for update", [address]);
    const account = result.rows[0];
    // Identical public responses for existing, inactive and unknown accounts.
    if (!account) return;
    await sendPasswordCode(code, id, purpose);
    await client.query("insert into public.cye_access_codes(admin_id,purpose,challenge_id,code_hash,password_hash_at_issue,expires_at) values($1,$2,$3,$4,$5,now()+interval '10 minutes') on conflict(admin_id,purpose) do update set challenge_id=excluded.challenge_id,code_hash=excluded.code_hash,password_hash_at_issue=excluded.password_hash_at_issue,expires_at=excluded.expires_at,attempts=0,created_at=now()", [account.id, purpose, id, hash, account.password_hash]);
    await audit(client, account, `admin.${purpose}_code_requested`, account.id);
  });
  return { challenge_id: id, message: "If this admin account exists, a six-digit code has been sent to the owner's verification email. It expires in 10 minutes. Check spam if needed." };
}

export async function verifyAccessCode(request: Request, input: Record<string, unknown>) {
  const { address, purpose } = accessInput(input);
  await rateLimit(request, "access-verify-identity", 12, 900, address);
  await rateLimit(request, "access-verify-global", process.env.TRUST_PROXY === "true" ? 30 : 100, 900);
  const code = text(input.code, "Email code", 6, true);
  const challengeId = text(input.challenge_id, "Verification request", 36, true);
  if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(challengeId)) fail(400, "Request a new code and enter its six digits.");
  const password = purpose === "reset" ? text(input.new_password, "New password", 256, true) : "";
  if (purpose === "reset" && password.length < 12) fail(400, "Choose a password with at least 12 characters.");
  const token = randomBytes(32).toString("hex");
  const result = await transaction(async client => {
    const account = (await client.query<AdminUser & { password_hash: string }>("select id,email,must_change_password,password_hash from public.cye_admin_users where email=$1 and active=true for update", [address])).rows[0];
    const invalid = { error: "The code is incorrect, expired, or unavailable. Request a new code." };
    if (!account) return invalid;
    const challenge = (await client.query("select *,expires_at>now() as valid from public.cye_access_codes where admin_id=$1 and purpose=$2 for update", [account.id,purpose])).rows[0];
    if (!challenge || challenge.challenge_id !== challengeId || !challenge.valid || challenge.attempts >= 5 || challenge.password_hash_at_issue !== account.password_hash) return invalid;
    if (!(await passwordMatches(code, challenge.code_hash))) {
      // Return the failure so the attempt increment commits before the HTTP error.
      await client.query("update public.cye_access_codes set attempts=attempts+1 where admin_id=$1 and purpose=$2", [account.id,purpose]);
      return invalid;
    }
    if (purpose === "reset") {
      if (await passwordMatches(password, account.password_hash)) return { error: "Choose a different password from your current password." };
      const hash = await passwordHash(password);
      await client.query("update public.cye_admin_users set password_hash=$2,must_change_password=false where id=$1", [account.id,hash]);
      await client.query("delete from public.cye_admin_sessions where admin_id=$1", [account.id]);
      await client.query("delete from public.cye_password_codes where admin_id=$1", [account.id]);
      await client.query("delete from public.cye_access_codes where admin_id=$1", [account.id]);
      await audit(client, account, "admin.password_reset", account.id);
      return { message: "Password reset successfully. Sign in with your new password." };
    }
    await client.query("delete from public.cye_access_codes where admin_id=$1 and purpose=$2", [account.id,purpose]);
    await client.query("insert into public.cye_admin_sessions(token_hash,admin_id,expires_at) values($1,$2,now()+make_interval(secs=>$3))", [tokenHash(token),account.id,SESSION_SECONDS]);
    await audit(client, account, "admin.email_sign_in", account.id);
    return { user: { id: account.id, email: account.email, must_change_password: account.must_change_password } };
  });
  if ("error" in result) fail(400, result.error!);
  if ("user" in result) await setSessionCookie(token);
  return result;
}
