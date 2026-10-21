/** Update only the three requested society duties. Preview unless --apply is passed. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const roles = {
  "al-nakhla": "Overall management of the pre-event.",
  "bahria-ssc": "Support partner.",
  "youth-insight": "Community outreach and promotions.",
};
const url = new URL(process.env.DATABASE_URL);
const db = new pg.Client({
  host: url.hostname, port: 6543, user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password), database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true, ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8") },
  connectionTimeoutMillis: 10000,
});
try {
  await db.connect();
  await db.query("begin");
  await db.query("set local lock_timeout='5s'");
  const before = (await db.query("select * from public.cye_content where id=any($1) and kind='sponsors' and deleted_at is null order by id for update", [Object.keys(roles)])).rows;
  if (before.length !== 3) throw Error("Expected all three society records; no changes made.");
  if (process.argv.includes("--apply")) {
    mkdirSync("test-results", { recursive: true });
    writeFileSync(`test-results/society-roles-backup-${Date.now()}.json`, JSON.stringify(before, null, 2));
    for (const [id, description] of Object.entries(roles)) {
      await db.query("update public.cye_content set data=jsonb_set(data,'{description}',$1::jsonb),updated_at=now() where id=$2", [JSON.stringify(description), id]);
    }
    const after = (await db.query("select id,data from public.cye_content where id=any($1)", [Object.keys(roles)])).rows;
    for (const row of before) {
      const actual = after.find(item => item.id === row.id).data;
      const expected = { ...row.data, description: roles[row.id] };
      if (Object.keys(expected).length !== Object.keys(actual).length || Object.entries(expected).some(([key, value]) => JSON.stringify(value) !== JSON.stringify(actual[key]))) throw Error("Verification failed; rolling back.");
    }
    await db.query("commit");
    console.log("Society duties updated and verified. Other fields preserved.");
  } else {
    await db.query("rollback");
    console.log("Preview only:", roles);
  }
} catch (error) {
  try { await db.query("rollback"); } catch {}
  console.error(error.code ? "Society update failed; rolled back." : error.message);
  process.exitCode = 1;
} finally { await db.end(); }
