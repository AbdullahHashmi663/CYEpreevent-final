// Applies only the reviewed additive index migration. Never seeds or edits user data.
import nextEnv from '@next/env';
import pg from 'pg';
import {readFileSync} from 'node:fs';
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const url=new URL(process.env.DATABASE_URL);
const client=new pg.Client({host:url.hostname,port:Number(url.port||5432),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:decodeURIComponent(url.pathname.slice(1)),ssl:{rejectUnauthorized:true,...(process.env.DATABASE_CA_FILE?{ca:readFileSync(process.env.DATABASE_CA_FILE,'utf8')}:{})},connectionTimeoutMillis:10000,statement_timeout:15000,application_name:'cye-additive-index-migration'});
try{
 await client.connect();await client.query('begin');await client.query("set local lock_timeout='2s'");
 await client.query(readFileSync('supabase/migrations/202610260001_backend_performance.sql','utf8'));
 await client.query('commit');
 const result=await client.query("select count(*)::int total from pg_indexes where schemaname='public' and indexname=any($1::text[])",[['cye_applications_created_id_idx','cye_applications_active_created_idx','cye_applications_pending_created_idx','cye_applications_archived_created_idx','cye_sessions_admin_idx']]);
 if(result.rows[0].total!==5)throw Error('Index verification failed');
 console.log('All five additive performance indexes are present. Existing records were preserved.');
}catch{await client.query('rollback').catch(()=>{});console.error('Index migration failed or timed out; database details suppressed.');process.exitCode=1;}
finally{await client.end().catch(()=>{});}
