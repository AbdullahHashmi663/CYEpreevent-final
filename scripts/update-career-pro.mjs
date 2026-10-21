/** Apply the confirmed workshop programme and auditorium venue; retain fees, dates and registrations. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
import ts from "typescript";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const compiled = ts.transpileModule(readFileSync("src/lib/cms-seed.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { SEED_CONTENT } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const ids = ["career-pro", "cye-nexus", "kanwal-cheema", "muhammad-talal-maqsood"];
const venue = "Auditorium, Bahria University, Islamabad";
const url = new URL(process.env.DATABASE_URL);
const db = new pg.Client({ host: url.hostname, port: 6543, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), ssl: { rejectUnauthorized: true, ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8") }, connectionTimeoutMillis: 10000 });
try {
  await db.connect(); await db.query("begin"); await db.query("set local lock_timeout='5s'");
  const before = (await db.query("select * from public.cye_content where id=any($1) order by id for update", [ids])).rows;
  for (const id of ["career-pro", "cye-nexus"]) if (!before.some(row => row.id === id && row.kind === "conferences" && !row.deleted_at)) throw Error("Expected session missing; no changes made.");
  if (before.some(row => row.deleted_at)) throw Error("Target record archived; review required.");
  const desired = ids.map(id => {
    const existing = before.find(row => row.id === id);
    const seed = SEED_CONTENT.find(row => row.id === id);
    let data;
    if (id === "cye-nexus") data = { ...existing.data, location: venue };
    else if (id === "career-pro") data = { ...existing.data, ...Object.fromEntries(["title", "subtitle", "description", "time", "location", "speaker_ids"].map(field => [field, seed[field]])) };
    else {
      if (existing && existing.kind !== "speakers") throw Error("Speaker ID belongs to another content type.");
      data = { ...(existing?.data || seed), ...Object.fromEntries(["title", "subtitle", "description", "category"].map(field => [field, seed[field]])) };
    }
    return { id, kind: existing?.kind || seed.kind, data };
  });
  if (process.argv.includes("--apply")) {
    mkdirSync("test-results", { recursive: true });
    writeFileSync(`test-results/career-pro-backup-${Date.now()}.json`, JSON.stringify(before, null, 2));
    for (const item of desired) await db.query("insert into public.cye_content(id,kind,data) values($1,$2,$3::jsonb) on conflict(id) do update set data=excluded.data,updated_at=now()", [item.id, item.kind, JSON.stringify(item.data)]);
    const after = (await db.query("select id,data from public.cye_content where id=any($1)", [ids])).rows;
    for (const expected of desired) {
      const actual = after.find(row => row.id === expected.id)?.data;
      if (!actual || Object.keys(actual).length !== Object.keys(expected.data).length || Object.entries(expected.data).some(([key,value]) => JSON.stringify(value) !== JSON.stringify(actual[key]))) throw Error("Verification failed; rolling back.");
    }
    await db.query("commit"); console.log("Career Pro details, two speaker profiles and both auditorium venues updated. Existing dates, fees, payment details and applications preserved.");
  } else { await db.query("rollback"); console.log("Preview:", desired.map(item => ({ id: item.id, title: item.data.title, time: item.data.time, location: item.data.location }))); }
} catch (error) {
  try { await db.query("rollback"); } catch {}
  console.error(error.code ? "Programme update failed; rolled back." : error.message); process.exitCode = 1;
} finally { await db.end(); }
