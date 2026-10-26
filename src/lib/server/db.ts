import "server-only";
import { readFileSync } from "node:fs";
import { Pool } from "pg";

const globalDb = globalThis as typeof globalThis & { cyePool?: Pool };

export function database(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  if (!globalDb.cyePool) {
    const url = new URL(process.env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error("Invalid database configuration.");
    const ca = process.env.DATABASE_CA_FILE ? readFileSync(process.env.DATABASE_CA_FILE, "utf8") : undefined;
    globalDb.cyePool = new Pool({
      host: url.hostname, port: Number(url.port || 5432),
      user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
      max: 3, connectionTimeoutMillis: 8000, idleTimeoutMillis: 15000,
      maxLifetimeSeconds: 300, keepAlive: true, allowExitOnIdle: true,
      statement_timeout: 10000, query_timeout: 12000,
      application_name: "cye-web",
    });
    // Never emit connection errors containing a credential or database URL.
    globalDb.cyePool.on("error", () => {});
  }
  return globalDb.cyePool;
}
