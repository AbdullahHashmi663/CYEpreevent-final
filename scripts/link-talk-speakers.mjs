/** Link editable talk speaker profiles to the same card template used by the workshop. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
import ts from "typescript";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const compiled = ts.transpileModule(readFileSync("src/lib/cms-seed.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { SEED_CONTENT } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const talk = SEED_CONTENT.find(row => row.id === "cye-nexus");
const ids = [talk.id, ...talk.speaker_ids];
const url = new URL(process.env.DATABASE_URL);
const db = new pg.Client({ host: url.hostname, port: 6543, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), ssl: { rejectUnauthorized: true, ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8") }, connectionTimeoutMillis: 10000 });
try {
  await db.connect(); await db.query("begin"); await db.query("set local lock_timeout='5s'");
  const before = (await db.query("select * from public.cye_content where id=any($1) order by id for update", [ids])).rows;
  if (!before.some(row => row.id === talk.id && row.kind === "conferences" && !row.deleted_at) || before.some(row => row.deleted_at)) throw Error("Target records missing or archived; no changes made.");
  mkdirSync("test-results", { recursive: true });
  writeFileSync(`test-results/talk-speakers-backup-${Date.now()}.json`, JSON.stringify(before, null, 2));
  const desired = ids.map(id => {
    const existing = before.find(row => row.id === id);
    const seed = SEED_CONTENT.find(row => row.id === id);
    if (existing && existing.kind !== seed.kind) throw Error("Unexpected content type; rolling back.");
    return { id, kind: seed.kind, data: id === talk.id ? { ...existing.data, speaker_ids: talk.speaker_ids, subtitle: talk.subtitle } : { ...(existing?.data || seed), title: seed.title, subtitle: seed.subtitle, category: seed.category } };
  });
  for (const row of desired) await db.query("insert into public.cye_content(id,kind,data) values($1,$2,$3::jsonb) on conflict(id) do update set data=excluded.data,updated_at=now()", [row.id, row.kind, JSON.stringify(row.data)]);
  const after = (await db.query("select id,data from public.cye_content where id=any($1)", [ids])).rows;
  for (const expected of desired) {
    const actual = after.find(row => row.id === expected.id)?.data;
    if (!actual || Object.keys(actual).length !== Object.keys(expected.data).length || Object.entries(expected.data).some(([key,value]) => JSON.stringify(value) !== JSON.stringify(actual[key]))) throw Error("Verification failed; rolling back.");
  }
  await db.query("commit"); console.log("Talk linked to two editable speaker profiles. Date, time, cover, fees and registration settings preserved.");
} catch (error) {
  try { await db.query("rollback"); } catch {}
  console.error(error.code ? "Speaker update failed; rolled back." : error.message); process.exitCode = 1;
} finally { await db.end(); }
