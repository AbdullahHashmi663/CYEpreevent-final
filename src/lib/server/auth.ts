import "server-only";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { PoolClient } from "pg";
import type { AdminUser } from "@/lib/cms-types";
import { database } from "./db";
import { fail } from "./http";

const SESSION_COOKIE = "cye_admin_session";
export const SESSION_SECONDS = 8 * 60 * 60;
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key)));
}
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function passwordMatches(password: string, hash: string) {
  const [method, salt, key] = hash.split(":");
  if (method !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(key || "")) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(key, "hex"));
}
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_SECONDS });
}
export async function currentAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await database().query<AdminUser>(
    `select u.id,u.email,u.must_change_password from public.cye_admin_users u
     join public.cye_admin_sessions s on s.admin_id=u.id
     where s.token_hash=$1 and s.expires_at>now() and u.active=true`, [tokenHash(token)],
  );
  return result.rows[0] || null;
}
export async function requireAdmin(allowPasswordChange = false): Promise<AdminUser> {
  const user = await currentAdmin();
  if (!user) fail(401, "Please sign in to the admin portal.");
  if (user.must_change_password && !allowPasswordChange) fail(428, "Please change your temporary password before making changes.");
  return user;
}
export async function audit(client: PoolClient, user: AdminUser, action: string, target: string, details: Record<string, unknown> = {}) {
  await client.query("insert into public.cye_audit(id,action,target_id,admin_email,details) values($1,$2,$3,$4,$5::jsonb)", [randomUUID(), action, target, user.email, JSON.stringify(details)]);
}
export async function startSession(user: AdminUser) {
  const token = randomBytes(32).toString("hex");
  const client = await database().connect();
  try {
    await client.query("begin");
    await client.query("delete from public.cye_admin_sessions where expires_at<=now()");
    await client.query("insert into public.cye_admin_sessions(token_hash,admin_id,expires_at) values($1,$2,now()+make_interval(secs=>$3))", [tokenHash(token), user.id, SESSION_SECONDS]);
    await audit(client, user, "admin.sign_in", user.id);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  await setSessionCookie(token);
}
export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const client = await database().connect();
    try {
      await client.query("begin");
      const session = await client.query<AdminUser>("select u.id,u.email,u.must_change_password from public.cye_admin_users u join public.cye_admin_sessions s on s.admin_id=u.id where s.token_hash=$1", [tokenHash(token)]);
      await client.query("delete from public.cye_admin_sessions where token_hash=$1", [tokenHash(token)]);
      if (session.rows[0]) await audit(client, session.rows[0], "admin.sign_out", session.rows[0].id);
      await client.query("commit");
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
  store.delete(SESSION_COOKIE);
}
