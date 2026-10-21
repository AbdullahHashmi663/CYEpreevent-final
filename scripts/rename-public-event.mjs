/** Rename event wording in current public CMS content; preserve applications and all other values. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
function rename(value) {
  if (typeof value === "string") return value.replace(/(?:pre-event\s+)?capital youth expo(?:\s+pre-event)?/gi, match => match === match.toUpperCase() ? "CAPITAL YOUTH EXPO PRE-EVENT" : "Capital Youth Expo pre-event");
  if (Array.isArray(value)) return value.map(rename);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rename(item)]));
  return value;
}
const url = new URL(process.env.DATABASE_URL);
const db = new pg.Client({ host: url.hostname, port: 6543, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), ssl: { rejectUnauthorized: true, ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8") }, connectionTimeoutMillis: 10000 });
try {
  await db.connect(); await db.query("begin"); await db.query("set local lock_timeout='5s'");
  const settings = (await db.query("select * from public.cye_site_settings where id=true for update")).rows[0];
  if (!settings) throw Error("Site settings missing; no changes made.");
  const content = (await db.query("select * from public.cye_content order by id for update")).rows;
  mkdirSync("test-results", { recursive: true });
  writeFileSync(`test-results/event-name-backup-${Date.now()}.json`, JSON.stringify({ settings, content }, null, 2));
  const renamedSettings = rename(settings.data);
  await db.query("update public.cye_site_settings set data=$1::jsonb,updated_at=now() where id=true", [JSON.stringify(renamedSettings)]);
  let count = 0;
  for (const row of content) {
    const desired = rename(row.data);
    if (JSON.stringify(desired) === JSON.stringify(row.data)) continue;
    await db.query("update public.cye_content set data=$1::jsonb,updated_at=now() where id=$2", [JSON.stringify(desired), row.id]); count++;
  }
  const after = (await db.query("select data from public.cye_site_settings where id=true")).rows[0].data;
  if (Object.entries(renamedSettings).some(([key, value]) => JSON.stringify(value) !== JSON.stringify(after[key]))) throw Error("Verification failed; rolling back.");
  await db.query("commit"); console.log(`Renamed event in site settings and ${count} content records. Registrations preserved.`);
} catch (error) {
  try { await db.query("rollback"); } catch {}
  console.error(error.code ? "Rename failed; rolled back." : error.message); process.exitCode = 1;
} finally { await db.end(); }
