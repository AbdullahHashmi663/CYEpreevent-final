# Competition registration contract

Speech requires CYE's `language` JSON field with the exact value `Urdu` or `English`. Our form and local admin records call this choice `speechLanguage`; the submission route maps it to `language` when forwarding the registration. Other competition payloads omit both fields. The local language record is still saved before forwarding and linked to the CYE reference after acceptance.

The original partner documentation omitted `language`. On October 26, 2026, the live API rejected a Speech payload without it with HTTP 422: `language: Choose English or Urdu for the speech`. Safe diagnostic requests with each language then reached the expected missing-payment-slip rejection. Diagnostics omitted the required payment file, used reserved-domain synthetic details, and created no registrations or confirmation emails.

CYE allows one submission per team-lead email per minute across competitions. Our Redis check retains the same window. An upstream validation rejection occurs after the local quota has been consumed, so the API returns the original error plus `Retry-After` (using the upstream value when provided). Upstream 429 headers are preserved. The form shows a countdown, keeps its entered fields editable and blocks repeat submissions until the window ends. It never retries a POST automatically, and uncertain outcomes still block resubmission to avoid duplicates.

Run `node scripts/test-partner-registration.mjs` for language mapping, non-Speech compatibility, validation/receipt checks, persistence, uncertain outcomes and retry headers. `node scripts/test-community-links.mjs`, lint, TypeScript and the production build check the related form integration. No successful live registration is submitted by these tests.
