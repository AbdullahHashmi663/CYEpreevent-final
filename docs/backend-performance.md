# Backend performance

## Findings and scope

The October 26 read-only audit found four local applications, 41 content rows and 26 database-backed images. Database execution for sampled queries was about 0.07–1.1 ms; client-to-database round trips measured roughly 190–420 ms. These measurements identify network round trips and unnecessary response sizes as the practical targets. They are not load-test latency guarantees.

The review covered local registration/contact submission, partner competition forwarding and exports, admin content/settings/moderation/authentication, Redis protection, database connections, media and private receipt delivery. Password derivation, session validation, fee checks, capacity locks, duplicate protection and private-response caching boundaries remain authoritative on the server. No financial or participant data is cached publicly.

## Implemented

- The admin workspace fetches settings, content, exact application totals, five pending applications and 50 audit entries in one SQL statement, replacing four queries and the 10,000-application payload. Counts are independent of the queue limit.
- `/api/admin/applications` requires admin authentication and returns 20 records per page. Search, status, type and archive filters execute in PostgreSQL. Search values are parameters, wildcard characters are literal, limits are validated and `created_at,id` ordering handles tied timestamps. Counts and rows use a single statement snapshot. Numbered pages use bounded offset pagination; very deep pages still cost more than the first page.
- The admin application and archive views request only the relevant page, debounce search and cancel obsolete requests. Refresh after moderation still reloads exact overview totals and the current list. Archived content remains recoverable separately from archived applications. No records are hidden behind the former 10,000-row workspace limit.
- Published CMS cache misses use one SQL statement/connection instead of two concurrent queries. The existing tagged cache and immediate admin invalidation remain. Seed fallback is outside the cache. Registration POST reads fresh database state and the partner catalogue directly.
- Five additive B-tree indexes support chronological pages/exports, active/pending/archived lists and admin session revocation. Existing indexes continue to support capacity and duplicate checks. No schema/table, RPC, RLS or credential changes were made.
- CSV downloads use a PostgreSQL cursor and 200-row batches in a read-only repeatable-read transaction. They preserve one snapshot, quote values, neutralize formula prefixes and retain identifiers/payment references. Cancellation rolls back and releases the connection; idle downloads are stopped after 10 seconds, with a database idle-transaction timeout as a backstop. A failed stream must be downloaded again. Exports have a Redis quota and use one of the three pool connections while active, so they are deliberately bounded rather than unlimited concurrent jobs.
- Partner Excel exports fetch their first page, then at most three independent GETs concurrently. Every page must match the initial count and expected size; duplicates, missing rows, changed totals and upstream errors fail the export. Page order stays deterministic, the 5,000-entry limit remains, and ExcelJS is loaded only when workbook generation starts. Registration POSTs are never automatically retried.
- Competition request protection runs before multipart parsing and the fresh upstream catalogue call. Invalid local competition IDs are rejected before calling CYE. Independent identity/IP checks for local submissions and authentication run concurrently, still using the existing atomic Redis counters and fail-closed behavior.
- Public media HEAD and conditional GET hits verify existence and return metadata without transferring the image blob out of PostgreSQL. Normal image responses retain immutable IDs/caching; private receipts remain authenticated and no-store.
- The database pool stays capped at three connections per process. Connections use TCP keepalive and a five-minute maximum lifetime; idle connections do not hold a short-lived Node process open. Failed transaction rollback destroys the connection rather than recycling a broken one. The cap has not been increased without evidence of database capacity.

## Validation and measurements

`node scripts/test-backend-performance.mjs` uses session-local temporary tables, never live registration rows, and rolls back fixtures. With 10,000 synthetic applications, the former bulk JSON was 13,892,022 bytes; the new workspace was 6,785 bytes and a 20-row page was 25,875 bytes. Fixture message lengths affect these sizes; this is a bounded-response/scaling comparison, not a claim that production currently transfers 13.9 MB.

Tests cover exact totals, all pages including empty/deep pages, equal timestamps, archived records, search/filter correctness, literal wildcards, SQL injection resistance, CSV formatting, backpressure/cancellation, rollback cleanup, conditional media requests, and bounded partner-export concurrency/failure handling. Existing partner/workshop/identity/avatar/cache/Redis tests and the production build are also run.

`node scripts/audit-backend.mjs LABEL` performs read-only EXPLAIN ANALYZE and saves aggregate measurements in ignored `test-results/backend-LABEL.json`. It never logs credentials or participant rows. `node scripts/apply-backend-performance-indexes.mjs` applies only the additive index migration, with a two-second lock timeout and a short statement timeout. For large future application tables, schedule index creation during a quiet period or use a separate reviewed concurrent-index deployment.

## Remaining operational limits

External CYE and verification-email latency is controlled by those providers. Registration POSTs keep live checks and uncertainty handling; caching them or blindly retrying could accept outdated fees or duplicate entries. Password/email verification still preserves its account-lock and one-use challenge guarantees. If sustained traffic justifies background email delivery, use a durable outbox with explicit challenge-delivery state rather than untracked background promises.

Local participant uploads remain bounded and stored in the existing database; optimized public images are CDN-cacheable. Moving private receipts to object storage is a separate storage/access-control migration, not necessary for the measured current volume. No large-scale production write/load test or guaranteed throughput claim is made. Browser visual checks require browser access to be enabled.
