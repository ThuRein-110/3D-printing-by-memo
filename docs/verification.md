# Verification record — 5 November 2026

Executed locally on Windows / Node 22.17.1 / pnpm 10.34.9, from the monorepo root.

| Check | Result | Scope |
| --- | --- | --- |
| ESLint | Passed | Apps, shared packages, scripts and tests |
| Strict TypeScript | Passed | Eight workspace packages plus worker/test tooling |
| Vitest | 30 passed | Pricing, snapshots, geometry, request limits, provider adapter decisions, Thai PDF generation and PostgreSQL integration |
| PostgreSQL migrations/RLS | Passed | All eight migrations on embedded PostgreSQL, with synthetic Auth/Storage schemas |
| Customer production build | Passed | Independent `turbo build --filter=@mfu/users` from root |
| Admin production build | Passed | Independent `turbo build --filter=@mfu/admin` from root |
| Playwright desktop/mobile smoke | 8 passed | Both production servers; landing page, language, viewport fit, configurator scaling/fallback, admin redirect, failed backend auth |
| Real Supabase browser scenarios | 2 skipped | Credentials, stock, SMTP and enrolled test MFA were not available |
| Production dependency audit | Passed | No known advisories reported at check time; vulnerable Sharp version was upgraded |
| Desktop visual inspection | Passed | Actual rendered screenshot: [preview-desktop.png](preview-desktop.png) |

The database suite checks cross-user reads, admin role/AAL2 requirements, direct-write/escalation denial, immutable upload hashes and quote snapshots, accepted-price protection, real-final-mesh requirements, transition authorization, stock visibility, idempotent reservation consumption, promotion capacity, provider budget/lease caps and gallery consent-record privacy. PGlite serializes calls; independent-session concurrency/load testing is still required on the real backend.

Not executed: hosted Vercel builds/deployments, live Supabase Auth/Storage/MFA/SMTP, actual Meshy reconstruction/billing, isolated slicer execution, distributed load tests, legal tax-document review or an independent penetration test. No live URLs were created or fabricated. The original implementation began without Git metadata; GitHub source publication is tracked separately from deployment.

See [operations](operations.md) for the external-service acceptance procedure and [limitations](limitations.md) for remaining product/operational work. A passing local build is not a claim of production readiness.
