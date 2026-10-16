import { randomInt, randomUUID } from "node:crypto";
import { transaction } from "@/lib/server/admin";
import { passwordHash, passwordMatches, requireAdmin } from "@/lib/server/auth";
import { checkOrigin, fail, handle, jsonBody, rateLimit, response } from "@/lib/server/http";
import { passwordEmailConfiguration, sendPasswordCode } from "@/lib/server/password-email";
import { text } from "@/lib/server/validation";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    const user = await requireAdmin(true);
    await rateLimit(request, "password-code", 5, 900, user.id);
    const input = await jsonBody(request);
    const current = text(input.current_password, "Current password", 256, true);
    passwordEmailConfiguration();
    const code = randomInt(0, 1000000).toString().padStart(6, "0");
    const hash = await passwordHash(code);
    const id = randomUUID();
    const destination = await transaction(async client => {
      const account = await client.query("select password_hash from public.cye_admin_users where id=$1 and active=true for update", [user.id]);
      if (!account.rows[0] || !(await passwordMatches(current, account.rows[0].password_hash))) fail(401, "Your current password is incorrect.");
      const recent = await client.query("select 1 from public.cye_password_codes where admin_id=$1 and created_at>now()-interval '60 seconds'", [user.id]);
      if (recent.rowCount) fail(429, "Wait 60 seconds before requesting another code.");
      const recipient = await sendPasswordCode(code, id);
      await client.query("insert into public.cye_password_codes(admin_id,challenge_id,code_hash,password_hash_at_issue,expires_at) values($1,$2,$3,$4,now()+interval '10 minutes') on conflict(admin_id) do update set challenge_id=excluded.challenge_id,code_hash=excluded.code_hash,password_hash_at_issue=excluded.password_hash_at_issue,expires_at=excluded.expires_at,attempts=0,created_at=now()", [user.id,id,hash,account.rows[0].password_hash]);
      return recipient;
    });
    return response({ challenge_id: id, message: `A verification code was sent to ${destination}. It expires in 10 minutes.` });
  });
}
