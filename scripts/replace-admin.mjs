/**
 * Replaces every existing CYE administrator with one account.
 * Required environment variables: ADMIN_REPLACEMENT_USERNAME and
 * ADMIN_REPLACEMENT_PASSWORD. The script never prints either value.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root, false, { info() {}, error() {} });
const username = process.env.ADMIN_REPLACEMENT_USERNAME?.trim().toLowerCase() || "";
const password = process.env.ADMIN_REPLACEMENT_PASSWORD || "";
if (!/^[a-z0-9][a-z0-9._@-]{2,99}$/.test(username) || password.length < 12) {
  throw new Error("Replacement administrator credentials are invalid.");
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Database configuration is unavailable.");
const url = new URL(databaseUrl);
const ca = process.env.DATABASE_CA_FILE ? readFileSync(process.env.DATABASE_CA_FILE, "utf8") : undefined;
const client = new pg.Client({
  host: url.hostname, port: Number(url.port || 5432), user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)),
  ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 10000,
  statement_timeout: 15000, query_timeout: 18000, application_name: "cye-admin-replacement",
});
try {
  await client.connect();
  const salt = randomBytes(16).toString("hex");
  const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  await client.query("begin");
  const account = await client.query(
    "insert into public.cye_admin_users(id,email,password_hash,must_change_password,active) values($1,$2,$3,false,true) on conflict(email) do update set password_hash=excluded.password_hash,must_change_password=false,active=true returning id",
    [randomUUID(), username, hash],
  );
  const id = account.rows[0].id;
  await client.query("update public.cye_media set admin_id=$1 where admin_id<>$1", [id]);
  await client.query("delete from public.cye_admin_sessions where admin_id<>$1", [id]);
  await client.query("delete from public.cye_admin_users where id<>$1", [id]);
  await client.query("delete from public.cye_admin_sessions where admin_id=$1", [id]);
  const check = await client.query("select count(*)::int as count from public.cye_admin_users where active=true");
  if (check.rows[0].count !== 1) throw new Error("Administrator replacement could not be verified.");
  await client.query("commit");
  console.log("Administrator replaced and prior sessions revoked. Exactly one active administrator remains.");
} catch (error) {
  try { await client.query("rollback"); } catch {}
  throw error;
} finally {
  await client.end();
}
