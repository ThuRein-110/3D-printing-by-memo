# Upgrade verification — 5 November 2026

The upgrade preserves the existing first eight migrations and baseline history. Only pending migration 009 adds generation controls and financial-data permissions. No production records, accounts or accepted quotation amounts were modified in this session.

## Checks

The staged source was exported to a separate temporary directory and installed with `pnpm install --frozen-lockfile` using a fresh dependency directory. Lint, strict TypeScript, all 43 unit/database tests, both independent production builds, Playwright and the production dependency audit passed there. The home page was also visually inspected in [light](upgrade-home-light.png) and [dark](upgrade-home-dark.png) system themes using the customer production server.

- Strict TypeScript across both apps, shared packages, worker and tests.
- ESLint across the repository.
- 43 Vitest unit/integration tests: existing pricing/order/inventory protections, GLB transforms/validation, STL export, photo workflow matching, four-language catalog completeness and placeholders, customer-safe financial projections, provider payload/progress/credits, worker success/failure/cancellation/retries and SQL daily/monthly/idempotency enforcement.
- All migrations executed on embedded PostgreSQL with synthetic Auth/Storage schemas. Customer access to sensitive quote JSON/pricing tables is denied. Accepted quotation protection remains tested.
- Independent Next.js production builds for the customer and admin applications.
- Eight desktop/mobile Playwright tests: all four languages, theme persistence/system changes, responsive layout, automatic photo routing, retained upload/dimensions, consent-gated submission, actual synthetic GLB rendering, scaling, theme-independent material color, quotation request, manual fallback and unauthorized admin rejection.
- Two connected non-production Supabase browser scenarios remain skipped without service configuration and confirmed test identities. No paid live provider scenario was run.
- Production dependency audit reports no known advisories at the recorded check.

The generation browser scenario uses explicit HTTP fixtures and a small synthetic GLB; it proves the renderer and client/server request contract, not a live Meshy reconstruction or a successful hosted database write. Worker tests use a provider test double. SQL tests execute real PostgreSQL logic in PGlite but do not establish hosted gateway behavior or independent-connection load properties.

The read-only connectivity script reported missing `SUPABASE_URL` and `SUPABASE_ANON_KEY`. No local app environment file, Meshy key or verified deployment URL was available. GitHub deployment/status metadata was inspected separately; no live deployment success is fabricated.

See [production-upgrade.md](production-upgrade.md) for provider pricing sources, variable names, migration/worker rollout and the exact remaining external verification gates. Clean-checkout verification and the final commit are also reported in the task handoff; these source documents do not embed a self-referential commit hash.
