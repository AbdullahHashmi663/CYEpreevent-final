// Read-only database profiling. Never prints application rows, credentials or query parameters.
import nextEnv from '@next/env';
import pg from 'pg';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const label = process.argv[2] || 'current';
if (!/^[a-z0-9-]+$/.test(label)) throw Error('Use a simple report label.');
const url = new URL(process.env.DATABASE_URL);
const client = new pg.Client({ host: url.hostname, port: Number(url.port || 5432), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)), ssl: { rejectUnauthorized: true, ...(process.env.DATABASE_CA_FILE ? { ca: readFileSync(process.env.DATABASE_CA_FILE, 'utf8') } : {}) }, connectionTimeoutMillis: 10000, statement_timeout: 15000, application_name: 'cye-readonly-performance-audit' });
const queries = {
  adminBulk: "select a.*,c.data->>'title' entry_title from public.cye_applications a left join public.cye_content c on c.id=a.entry_id order by a.created_at desc limit 10000",
  applicationPage: "select a.*,c.data->>'title' entry_title from public.cye_applications a left join public.cye_content c on c.id=a.entry_id where a.deleted_at is null order by a.created_at desc,a.id desc limit 20",
  capacity: "select coalesce(sum(1+jsonb_array_length(coalesce(payload->'team_members','[]'::jsonb))),0) from public.cye_applications where entry_id='conference-1' and deleted_at is null and status<>'rejected'",
  pendingQueue: "select a.*,c.data->>'title' entry_title from public.cye_applications a left join public.cye_content c on c.id=a.entry_id where a.deleted_at is null and a.status='pending' order by a.created_at desc,a.id desc limit 5",
};
const workspaceSql = readFileSync('src/lib/server/admin.ts','utf8').match(/getAdminData[\s\S]*?database\(\)\.query\(`([\s\S]*?)`\)/)?.[1];
if (workspaceSql) queries.workspace = workspaceSql;
try {
  await client.connect();
  await client.query('begin read only');
  const sizes = (await client.query("select relname, n_live_tup::bigint estimated_rows, pg_total_relation_size(relid)::bigint bytes from pg_stat_user_tables where schemaname='public' and relname like 'cye_%' order by relname")).rows;
  const plans = {};
  for (const [name, sql] of Object.entries(queries)) {
    const started = performance.now();
    const plan = (await client.query('explain (analyze, buffers, format json) ' + sql)).rows[0]['QUERY PLAN'][0];
    plans[name] = { roundTripMs: Math.round(performance.now() - started), planningMs: plan['Planning Time'], executionMs: plan['Execution Time'], plan: plan.Plan };
  }
  const payloads = (await client.query(`select
    (select coalesce(sum(octet_length(row_to_json(r)::text)),0) from (${queries.adminBulk}) r) bulk_bytes,
    (select coalesce(sum(octet_length(row_to_json(r)::text)),0) from (${queries.applicationPage}) r) page_bytes,
    (select count(*) from public.cye_applications) applications`)).rows[0];
  await client.query('rollback');
  const report = { measuredAt: new Date().toISOString(), sizes, payloads, plans };
  mkdirSync('test-results', { recursive: true });
  writeFileSync(`test-results/backend-${label}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ payloads, plans: Object.fromEntries(Object.entries(plans).map(([k,v]) => [k, {roundTripMs:v.roundTripMs,executionMs:v.executionMs}])) }, null, 2));
} catch {
  console.error('Read-only backend audit failed. Connection details were suppressed.');
  process.exitCode = 1;
} finally { await client.end().catch(() => {}); }
