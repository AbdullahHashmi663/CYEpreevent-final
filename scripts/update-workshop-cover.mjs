/** Replace only the Career Pro cover; save the previous record for recovery. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const url = new URL(process.env.DATABASE_URL);
const db = new pg.Client({ host: url.hostname, port: 6543, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), ssl: { rejectUnauthorized: true, ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8") }, connectionTimeoutMillis: 10000 });
try {
  await db.connect(); await db.query("begin"); await db.query("set local lock_timeout='5s'");
  const before = (await db.query("select * from public.cye_content where id='career-pro' and kind='conferences' and deleted_at is null for update")).rows[0];
  if (!before) throw Error("Workshop record missing; no changes made.");
  mkdirSync("test-results", { recursive: true });
  writeFileSync(`test-results/workshop-cover-backup-${Date.now()}.json`, JSON.stringify(before, null, 2));
  const expected = { ...before.data, image_url: "/images/career-pro-workshop.png" };
  await db.query("update public.cye_content set data=$1::jsonb,updated_at=now() where id='career-pro'", [JSON.stringify(expected)]);
  const actual = (await db.query("select data from public.cye_content where id='career-pro'")).rows[0].data;
  if (Object.keys(actual).length !== Object.keys(expected).length || Object.entries(expected).some(([key,value]) => JSON.stringify(value) !== JSON.stringify(actual[key]))) throw Error("Verification failed; rolling back.");
  await db.query("commit"); console.log("Workshop cover updated. All other fields preserved.");
} catch (error) {
  try { await db.query("rollback"); } catch {}
  console.error(error.code ? "Cover update failed; rolled back." : error.message); process.exitCode = 1;
} finally { await db.end(); }
