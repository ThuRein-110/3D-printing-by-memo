# Security model and review

Upgrade 009 adds column-level protection for quote financial JSON and revokes customer access to pricing tables. Customer APIs project safe estimates; admin cost access is checked server-side. Generation has serialized monthly allowance reservations, daily customer limits, consent records and an atomic at-most-once submission guard. The GLB parser has bounded scene traversal, accessor decoding and triangle counts; it never fetches external resources. See [production upgrade](production-upgrade.md).

Trust boundaries are customer browser → Next server → Supabase; admin browser → independent Next server → the same backend; and durable worker → Meshy → untrusted output parsing. The service credential bypasses RLS, so explicit handler ownership checks are essential in addition to database read policies. Keep it server-only, rotate on exposure and never use it for browser initialization.

Implemented controls:

- Authenticated identity verified with `getUser`, not an unverified session object. Admin role is stored out of band and requires AAL2 in SQL.
- Deny-by-default RLS on all business tables; browser roles have read-only grants subject to policies. Internal production notes, rate-limit keys, provider budgets and audit rows have no customer policies.
- Exact configured Origin checks on every mutation; cookies remain managed by Supabase SSR. Same-origin requests and HTTPS are required in production. Do not use wildcard CORS.
- UUID ownership queries on files, orders, quotes, jobs, evidence and documents. Human-readable order numbers do not grant access. Signed file URLs expire after 60 seconds and are issued only after the same ownership check.
- Bounded streamed request bodies; 4 MiB file cap, magic signatures and actual image decoding, 20-million-pixel image cap, 100,000-triangle mesh parser cap, finite coordinate checks. SVG, external OBJ resources, textured/external/compressed GLB and arbitrary model scripts are disabled. Bounded mesh-only 3MF parsing and GLB scene transforms are validated; see model-catalog.md.
- Server-side estimate recalculation, immutable hashes/snapshots, transactionally guarded status transitions, promotion allocation and inventory adjustments. Accepted quotes cannot be silently revised.
- Database rate limits: 20 authentication attempts per hashed forwarded-address window of 15 minutes, 20 uploads/hour, 30 quotes/hour, 3 AI enqueue attempts/day per identity. Supabase Auth must independently protect registration, OTP and credential endpoints. Use a trusted hosting proxy for forwarded-address rate keys.
- Exact provider endpoint/asset-host allowlists, no arbitrary remote image URL inputs or asset redirects, streamed download cap, request timeouts, daily reservation ledger and no ambiguous paid-submission retries.
- Escaped React text, parameterized Supabase calls, no HTML injection, no broad Storage policies, no secrets in NEXT_PUBLIC variables. Response headers restrict frames, plugins, base URLs and browser capabilities. CSP allows inline Next bootstrapping scripts; a nonce-based strict CSP is a future hardening item.

Automated PostgreSQL checks exercise owner isolation, admin MFA, escalation denial, immutable snapshots/files, hidden colors, negative stock, promotion cap and transition authorization. Unit tests exercise pricing, parsers, streaming caps, provider SSRF, timeouts and ambiguous retry decisions. Embedded PostgreSQL uses synthetic auth claims to test SQL enforcement; production authentication and gateway configuration still require live tests.

Source review concentrated on service-role routes, RLS/grants, upload parsing, provider retrieval and state mutations. The audit identified vulnerable Sharp/libvips dependencies; upgrading Sharp removed known production advisories at the recorded check. This is a development review, not a completed independent penetration test or a Codex Security hosted scan.

Operational logs currently expose only worker event codes; raw provider errors and secrets are not logged. Database audit before/after records can include customer notes and must remain admin-only with an operator-defined retention period. Some service-role audit actors are null; full actor attribution and comprehensive structured web-request logging remain to be added. Retention/export/deletion requests are recorded but fulfilled manually. Never publish reference material without consent recorded for the specific gallery entry. Gallery file rendering is currently disabled rather than serving customer bucket paths publicly.

Catalog assets are private and separate from customer files. Public images require an approved published model; public geometry additionally requires preview permission. Licensing evidence and quotation cost reviews remain admin-only. Customer order snapshots are owner-scoped and immutable.
