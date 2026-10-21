# Capital Youth Expo

An orange-and-blue event website and organizer portal built with Next.js 16.3.8, React 19, and Supabase PostgreSQL. The public website covers the home page, conferences and speakers, competitions, team, venue, contact, and registration. The organizer workspace is at `/admin`.

The interface includes responsive layouts, animated section reveals, a photo gallery, animated statistics, and reduced-motion support. Its visual direction follows [Capital Youth Expo](https://www.capitalyouthexpo.com/).

Al Nakhla and **Student Support Centre, Bahria University Islamabad** are separate organizer entries. The SSC image at `public/images/bahria-ssc-logo.jpg` was downloaded from the [official SSC BUIC Facebook page](https://www.facebook.com/OfficialSSC.BUIC/) linked by the organizer. `node scripts/update-organizers.mjs --apply` corrects the original combined attribution on existing installations; it preserves registrations and payment settings and saves a private backup first.

The competition programme is organized into **Tech Nexus** (Speed Programming, Hackathon), **Venture X** (Pitch Your Idea), **Spectrum** (Reel Competition, Graphic Design), and **Literary** (Speech). Conferences include one **Career Pro Workshop** and one **Talk**. These sections also appear in the admin editor and registration selector. Older competitions are unpublished and remain available to organizers. Configure fees, wallet details, team sizes, and rules in admin before accepting paid entries.

**Career Pro is paid:** organizers set the fee and payment instructions; participants must upload a receipt. **The Talk is free, with mandatory registration.** Both accept exactly one participant per registration. A workshop without an admin-set positive fee cannot accept registrations. Workshop receipts use the same private storage, fee snapshot, and approval workflow as competitions.

For an existing installation, `node scripts/update-programme.mjs` previews the poster lineup update; `--apply` saves a private backup and applies it while preserving existing payment settings and applications. This is a one-time content migration, not a routine deployment step.

## Local setup

Use Node.js 20.9 or later (this workspace uses Node 24).

```sh
git clone https://github.com/AbdullahHashmi663/CYEpreevent-final.git
cd CYEpreevent-final
npm ci
```

Copy `.env.example` to `.env.local` and fill in your database connection and bootstrap account. Keep `.env.local` private. Percent-encode special characters in the database password. The app connects to Supabase from its server; no database password is included in browser code.

The supplied Supabase CA certificate is at `supabase/certs/prod-ca-2021.crt`. TLS verifies the database certificate and hostname. If your project uses a different CA, download it from Supabase Database Settings and update `DATABASE_CA_FILE`.

```sh
npm run db:setup
npm run db:check
npm run dev
```

Open `http://localhost:3000` and `http://localhost:3000/admin`. The database setup creates only new `cye_*` tables and preserves existing content/settings/admin passwords when repeated. Bootstrap passwords must be changed after the first sign-in. The sign-in screen accepts a username or email. No working administrator credentials are included in this repository.

The admin login includes **Email passkey** (a six-digit email sign-in code) and **Forgot password?**. Codes go only to `ADMIN_SECURITY_EMAIL` through the existing `RESEND_API_KEY` / `EMAIL_FROM` configuration. They expire after 10 minutes, permit five incorrect attempts, are stored as salted hashes, and are single-use and bound to their purpose and account. Code requests and verification are rate limited. Password recovery requires a new password of at least 12 characters, revokes all sessions and outstanding codes for that admin, and returns the user to password sign-in. Unknown accounts receive the same public request message. No WebAuthn/device passkey is used.

Apply `supabase/migrations/202610180001_admin_access_codes.sql` when updating an existing installation. `node scripts/access-code-check.mjs --skip-email` verifies an isolated local server at port 3100 with seeded QA codes; the local server needs dummy email configuration for unknown-account checks. Production verification uses `CYE_ACCESS_TEST_ORIGIN=https://cyepreevent-final.vercel.app` and no skip flag, sends sign-in and reset verification emails to the configured owner, and removes its disposable QA account and sessions afterward.

## Organizer workflow

- Add/edit conferences, assign speakers, upload photographs, publish drafts, and control display order.
- Maintain team profiles, partners, contests, rules, fees, capacity, and minimum/maximum team sizes.
- The team page includes a scrolling photo marquee after the lead cards. Team member name, Position, Department, and portrait are edited in admin; published profiles appear automatically. Empty departments show “To be announced.” The marquee pauses on hover/focus, has a Pause/Resume control, and becomes a manually scrollable gallery for reduced-motion preferences.
- Edit event name, headline, imagery, copy, date, venue, contacts, social links, and registration availability in Site settings.
- Search applications and contact messages, inspect team rosters, approve, reject with a reason, return to pending, and export CSV.
- Archive content and applications without deleting them permanently. Restore records from Trash & restore.
- Review the activity log and change your account password.

The original event date, 1 October 2026, is retained. Registration starts closed. To accept entries for a future edition, update the site date **and each relevant conference/contest date**, then enable registration. Pending and approved participants reserve capacity; rejected and archived applications do not. A restore/reapproval that would exceed capacity is refused.

Public forms save to the database and return a reference. Confirmation means receipt, not approval. Competitions require a positive admin-set entry fee and a payment receipt (JPEG, PNG, WebP or PDF, up to 2 MB). The listed fee covers one individual/team registration. Organizers can edit payment account instructions per competition. Entries with no configured fee cannot accept registrations. The fee is captured at submission, so later price changes do not alter earlier applications. Receipts are stored atomically with applications in a private database table and downloaded only through an authenticated admin endpoint. Organizers review the receipt against their payment account before approving. Receipt submission does not automatically verify a payment; an online payment gateway is not configured. Contact messages remain available when event registration is closed.

## Production

Deploy to a Node.js host that supports server-side PostgreSQL connections, such as a container, VM, or compatible Next.js hosting. A static export cannot run the database and admin API.

```sh
npm run build
npm start
```

Set `DATABASE_URL`, `DATABASE_CA_FILE`, and `APP_ORIGIN` in the hosting environment; `APP_ORIGIN` must be the exact HTTPS website origin. Copy the CA certificate into the deployment. Use the transaction pooler connection from Supabase's Connect dialog if your host uses many short-lived server instances; do not invent its hostname. This workspace uses the provided session pooler.

Use HTTPS so production admin cookies can be sent securely. Set `TRUST_PROXY=true` only when your host strips and supplies trusted `x-forwarded-for` headers. Otherwise rate limits use the site-wide bucket plus per-email/account limits. Remove bootstrap password settings after the owner has changed their password; repeated setup does not reset it.

Pushing this repository to GitHub publishes the source code. To serve the website publicly, connect this repository to a compatible Next.js host, add the private environment variables from `.env.example`, set the production `APP_ORIGIN`, and run the build/start commands above. Keep database credentials in the host's secret settings.

## Administrator recovery

Password changes in the admin portal require the current password plus a six-digit code emailed to the owner. Set `ADMIN_SECURITY_EMAIL`, `RESEND_API_KEY`, and `EMAIL_FROM` in the hosting environment; `EMAIL_FROM` must be an authorized sender for your Resend account. The owner security address is configured privately and cannot be changed by the password form. Run the database migrations before deploying this feature. Codes expire after 10 minutes, permit five incorrect attempts, and are consumed atomically with the password change. Requesting a replacement code invalidates the previous code; requests have a 60-second cooldown and a per-account rate limit. Delivery is unavailable until the email provider is configured; the portal does not bypass verification when delivery fails.

`npm run admin:replace` intentionally replaces **all** administrator accounts with a single username or email and revokes their sessions. Use only for an authorized administrator reset. Supply `ADMIN_REPLACEMENT_USERNAME` and `ADMIN_REPLACEMENT_PASSWORD` through your local environment; the password must contain at least 12 characters. This command preserves site content, applications, and uploaded images. Never put these credentials in a committed file.

## Verification

```sh
npm run lint
npm run build
npm run db:check
```

With the local app running, `npm run test:integration` exercises the database/API workflows using isolated test records. Run it while no organizer is editing settings; it temporarily changes registration settings and restores them in its cleanup. The latest run passed 130 live integration assertions covering authentication, password rotation, all five content types, speaker assignments, uploads, settings, registration limits, moderation, archives, restores, exports, and audit logging. Cleanup verifies that real administrator credentials and original settings are preserved.

The source uses server-only database access, parameterized queries, scrypt password hashes, hashed expiring sessions, origin checks, first-sign-in password changes, bounded validated uploads, recoverable archives, audit records, and CSV formula escaping. Supabase Data API roles cannot access the app's tables. No separate API server is needed.

Browser checks covered signed-in navigation, content editors, search, visibility and application filters, account settings, mobile navigation, and sign-out. Multi-page application pagination has not yet been verified.

Known findings from the latest browser checks: dashboard loading temporarily returned a service error twice before recovering on retry; content search and visibility filters carry between content sections and may show an empty list until cleared. These findings remain open.
