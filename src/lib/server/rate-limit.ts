import "server-only";
import { createHash } from "node:crypto";
import { redisClient } from "./redis";

export const RATE_LIMIT_PREFIX = process.env.REDIS_KEY_PREFIX || `cye:${process.env.VERCEL_ENV || process.env.NODE_ENV || "development"}:rate-limit:v1:`;
// One atomic decision: concurrent instances cannot overspend the shared quota.
// Every counter expires; denied requests never extend the current window.
export const RATE_LIMIT_SCRIPT = `
local ttl = redis.call('PTTL', KEYS[1])
local window = tonumber(ARGV[2])
if ttl < 0 then
  redis.call('SET', KEYS[1], '1', 'PX', window)
  return {1, window}
end
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
if count >= tonumber(ARGV[1]) then
  return {0, ttl}
end
redis.call('INCR', KEYS[1])
return {1, ttl}
`;
export function rateLimitKey(scope: string, ip: string, identity = "") {
  return RATE_LIMIT_PREFIX + createHash("sha256").update(`${scope}:${ip}:${identity}`).digest("hex");
}
export async function consumeRateLimit(key: string, limit: number, seconds: number) {
  if (!key.startsWith(RATE_LIMIT_PREFIX) || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(seconds) || seconds < 1 || seconds > 86400) throw new Error("Invalid rate limit configuration.");
  const client = await redisClient();
  const result = await client.withCommandOptions({ abortSignal: AbortSignal.timeout(3000) }).eval(RATE_LIMIT_SCRIPT, { keys: [key], arguments: [String(limit), String(seconds * 1000)] });
  if (!Array.isArray(result) || result.length !== 2 || (result[0] !== 0 && result[0] !== 1) || typeof result[1] !== "number" || result[1] < 0) throw new Error("Invalid rate limit response.");
  return { allowed: result[0] === 1, retryAfter: Math.max(1, Math.ceil(result[1] / 1000)) };
}
