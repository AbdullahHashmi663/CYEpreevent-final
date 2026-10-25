import "server-only";
import { createClient } from "redis";

function createRateLimitClient(raw: string) {
  return createClient({ url: raw, socket: { connectTimeout: 5000, reconnectStrategy: false }, disableOfflineQueue: true, commandsQueueMaxLength: 1000 });
}
type Client = ReturnType<typeof createRateLimitClient>;
const shared = globalThis as typeof globalThis & { cyeRedis?: Client; cyeRedisConnecting?: Promise<Client> };

export async function redisClient(): Promise<Client> {
  if (shared.cyeRedis?.isReady) return shared.cyeRedis;
  if (shared.cyeRedisConnecting) return shared.cyeRedisConnecting;
  const raw = process.env.REDIS_URL;
  if (!raw) throw new Error("Redis is not configured.");
  try { if (!["redis:", "rediss:"].includes(new URL(raw).protocol)) throw new Error(); }
  catch { throw new Error("Invalid Redis configuration."); }
  const client = createRateLimitClient(raw);
  // Connection errors can contain credentials. Never log raw Redis errors.
  client.on("error", () => {});
  const connecting = client.connect().then(() => {
    shared.cyeRedis = client;
    return client;
  }).catch(() => {
    if (client.isOpen) client.destroy();
    throw new Error("Redis connection unavailable.");
  }).finally(() => { shared.cyeRedisConnecting = undefined; });
  shared.cyeRedisConnecting = connecting;
  return connecting;
}
