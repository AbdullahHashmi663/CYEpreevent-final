# Redis rate limiting

All existing server-side rateLimit() callers now use Redis rather than public.cye_rate_limits in Postgres. No in-process request counters or database fallback are used. The reusable server-side connection is cached per process, but quota state lives only in Redis and is shared across instances.

## Configuration

Set REDIS_URL in ignored .env.local for development and in Vercel Production and Preview before merging this PR. Never use NEXT_PUBLIC_ for this connection string. REDIS_KEY_PREFIX is optional; defaults are cye:production:rate-limit:v1:, cye:preview:rate-limit:v1: and cye:development:rate-limit:v1:. Separate namespaces prevent local/preview requests from consuming production counters. When running standalone integration scripts against a production build, set NODE_ENV=production or the same REDIS_KEY_PREFIX on both the server and scripts.

The supplied connection uses redis:// (unencrypted TCP). The implementation also supports rediss:// with normal certificate verification when TLS is enabled by the Redis provider. Do not disable certificate checks. Credentials remain environment-only; no connection strings or raw provider errors are logged.

## Behavior

An atomic Lua script makes the allow/deny decision, increments allowed requests, and applies an expiring fixed window. Denied requests do not extend the TTL. Missing-expiry counters are repaired. Keys use a SHA-256 digest of scope, trusted client IP and optional identity; raw email addresses are not stored in key names. Existing quotas and trusted-proxy behavior are preserved.

Exceeded limits return HTTP 429 with Retry-After. Missing credentials, Redis outages and command timeouts return a sanitized HTTP 503 with Retry-After: 5. Protected requests fail closed. The connection timeout is 5 seconds, commands are bounded to 3 seconds, reconnection retries and offline command replay are disabled to avoid replaying an uncertain increment. In-memory connection reuse does not store quota counters.

No Supabase table or RPC is added. The old cye_rate_limits table and historical migrations are retained for rollback compatibility, but runtime code no longer reads or writes that table. Switching stores starts fresh quota windows; existing windows are not copied.

## Validation

node scripts/test-redis-rate-limit.mjs uses unique short-lived synthetic keys to test atomic limits across two clients and 30 concurrent calls, expiry, TTL preservation, HTTP 429/Retry-After and sanitized fail-closed errors. Cleanup deletes only the explicit keys from that run. Existing access-code, integration and payment QA harnesses now seed/clear their rate-limit fixtures in Redis. Never use FLUSHDB or FLUSHALL.

Also run node scripts/test-partner-registration.mjs, node scripts/test-session-identification.mjs, npm run lint, npx tsc --noEmit and npm run build. No test submits a real registration or sends email unless the separate live QA harness is explicitly invoked.

## Rollout

Merge only through the feature branch PR after validation. Deploy the merged main branch with REDIS_URL configured. Watch for HTTP 503 request-protection responses after rollout. Keep the previous application version available for rollback; the historical Postgres rate-limit table remains intact.
