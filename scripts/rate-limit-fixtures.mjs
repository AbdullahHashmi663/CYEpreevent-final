import { createClient } from "redis";
// Fixtures only operate on explicitly supplied synthetic counter hashes.
let client;
const prefix = () => process.env.REDIS_KEY_PREFIX || `cye:${process.env.VERCEL_ENV || process.env.NODE_ENV || "development"}:rate-limit:v1:`;
export const fixtureRateLimitKey = bucket => {
  if (!/^[a-f0-9]{64}$/.test(bucket)) throw new Error("Invalid QA rate-limit bucket.");
  return prefix() + bucket;
};
async function store() {
  if (client?.isReady) return client;
  client=createClient({url:process.env.REDIS_URL,socket:{connectTimeout:5000,reconnectStrategy:false},disableOfflineQueue:true});
  client.on("error",()=>{});
  try { await client.connect(); return client; } catch { throw new Error("QA Redis connection unavailable."); }
}
export async function clearRateLimitBuckets(buckets) {
  const keys=[...buckets].map(fixtureRateLimitKey);
  if (keys.length) await (await store()).del(keys);
}
export async function seedRateLimitBucket(bucket,count,seconds) {
  await (await store()).set(fixtureRateLimitKey(bucket),String(count),{EX:seconds});
}
export async function closeRateLimitFixtures() { if(client?.isOpen) client.destroy(); }
