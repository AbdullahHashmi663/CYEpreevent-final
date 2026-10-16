/**
 * CYE database setup: node scripts/db-setup.mjs
 * Read-only connectivity/schema check: node scripts/db-setup.mjs --check
 * Loads ignored .env.local from the project root. Required: DATABASE_URL,
 * ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD (at least 16 characters).
 * Optional DATABASE_CA_FILE: trusted Supabase CA certificate path. TLS certificate
 * verification is always enabled. Download a required CA from the database's
 * Supabase Dashboard; do not disable TLS verification to bypass a certificate error.
 * Re-running is additive: existing content, settings, and admin passwords are kept.
 * After first sign-in the admin must replace the bootstrap password.
 * Validation: --check, then sign in, change password, edit a draft, reload public
 * pages, submit a contact message, approve/reject/archive/restore it, and export CSV.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root, false, { info() {}, error() {} });
let client;
try {
  if (!process.env.DATABASE_URL) throw Object.assign(new Error(), { code: "DATABASE_URL_REQUIRED" });
  const url = new URL(process.env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw Object.assign(new Error(), { code: "INVALID_DATABASE_URL" });
  const ca = process.env.DATABASE_CA_FILE ? readFileSync(process.env.DATABASE_CA_FILE, "utf8") : undefined;
  client = new pg.Client({ host: url.hostname, port: Number(url.port || 5432), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 10000, statement_timeout: 15000, query_timeout: 18000, application_name: "cye-setup" });
  await client.connect();
  if (process.argv.includes("--check")) {
    const { rows } = await client.query("select (select count(*) from public.cye_content)::int content_records,(select count(*) from public.cye_admin_users)::int admins,(select count(*) from public.cye_site_settings)::int settings,(select count(*) from public.cye_applications)::int applications");
    console.log("Database connection and CYE schema verified.", rows[0]);
  } else {
    const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || !adminPassword || adminPassword.length < 16) throw Object.assign(new Error(), { code: "BOOTSTRAP_CREDENTIALS_REQUIRED" });
    const source = readFileSync(resolve(root, "src/lib/cms-seed.ts"), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const { DEFAULT_SETTINGS, SEED_CONTENT } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
    const salt = randomBytes(16).toString("hex");
    const hash = `scrypt:${salt}:${scryptSync(adminPassword, salt, 64).toString("hex")}`;
    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    const migrationDirectory = resolve(root, "supabase/migrations");
    for (const filename of readdirSync(migrationDirectory).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
      await client.query(readFileSync(resolve(migrationDirectory, filename), "utf8"));
    }
    await client.query("insert into public.cye_site_settings(id,data) values(true,$1::jsonb) on conflict(id) do nothing", [JSON.stringify(DEFAULT_SETTINGS)]);
    for (const record of SEED_CONTENT) await client.query("insert into public.cye_content(id,kind,data) values($1,$2,$3::jsonb) on conflict(id) do nothing", [record.id, record.kind, JSON.stringify(record)]);
    const admin = await client.query("insert into public.cye_admin_users(id,email,password_hash) values($1,$2,$3) on conflict(email) do nothing returning id", [randomUUID(), adminEmail, hash]);
    await client.query("commit");
    console.log("CYE schema and initial content are ready. Existing data was preserved.");
    console.log(admin.rowCount ? "Bootstrap admin created. Change its password at first sign-in." : "Existing admin retained; its password was not changed.");
  }
} catch (error) {
  if (client) { try { await client.query("rollback"); } catch {} }
  const knownCode = typeof error?.code === "string" && /^[A-Z0-9_]{2,70}$/.test(error.code) ? error.code : "CONNECTION_OR_SETUP_ERROR";
  console.error(`Database setup failed (${knownCode}). Check connectivity, trusted TLS certificate, and private environment configuration. No credentials were logged.`);
  process.exitCode = 1;
} finally {
  if (client) { try { await client.end(); } catch {} }
}
