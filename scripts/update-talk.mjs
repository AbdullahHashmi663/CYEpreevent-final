/** Update the confirmed talk only; preserve registration, payment and date settings. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
import ts from "typescript";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const compiled = ts.transpileModule(readFileSync("src/lib/cms-seed.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { SEED_CONTENT } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const talk = SEED_CONTENT.find(record => record.id === "cye-nexus");
const fields = ["title", "subtitle", "description", "time", "image_url"];
const url = new URL(process.env.DATABASE_URL);
const db = new pg.Client({ host: url.hostname, port: 6543, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), ssl: { rejectUnauthorized: true, ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8") }, connectionTimeoutMillis: 10000 });
try {
  await db.connect();
  await db.query("begin");
  await db.query("set local lock_timeout='5s'");
  const before = (await db.query("select * from public.cye_content where id='cye-nexus' and kind='conferences' and deleted_at is null for update")).rows[0];
  if (!before) throw Error("Talk record missing; no changes made.");
  const expected = { ...before.data, ...Object.fromEntries(fields.map(field => [field, talk[field]])) };
  if (process.argv.includes("--apply")) {
    mkdirSync("test-results", { recursive: true });
    writeFileSync(`test-results/talk-backup-${Date.now()}.json`, JSON.stringify(before, null, 2));
    await db.query("update public.cye_content set data=$1::jsonb,updated_at=now() where id='cye-nexus'", [JSON.stringify(expected)]);
    const actual = (await db.query("select data from public.cye_content where id='cye-nexus'")).rows[0].data;
    if (Object.keys(expected).length !== Object.keys(actual).length || Object.entries(expected).some(([key, value]) => JSON.stringify(value) !== JSON.stringify(actual[key]))) throw Error("Talk verification failed; rolling back.");
    await db.query("commit");
    console.log("Talk title, speakers, time and artwork updated. All other settings preserved.");
  } else {
    await db.query("rollback");
    console.log("Preview:", Object.fromEntries(fields.map(field => [field, expected[field]])));
  }
} catch (error) {
  try { await db.query("rollback"); } catch {}
  console.error(error.code ? "Talk update failed; rolled back." : error.message);
  process.exitCode = 1;
} finally { await db.end(); }
